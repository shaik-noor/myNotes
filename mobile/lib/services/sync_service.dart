import 'dart:async';
import '../models/note.dart';
import '../models/attachment.dart';
import '../models/backup_manifest.dart';
import '../models/sync_result.dart';
import 'storage_service.dart';
import 'auth_service.dart';
import 'google_drive_service.dart';

enum SyncStatus { idle, syncing, success, error }

class SyncService {
  final StorageService _storage;
  final AuthService _auth;
  final GoogleDriveService _drive;

  SyncStatus _status = SyncStatus.idle;
  String? _lastError;
  bool _isSyncing = false;

  final _syncStreamController = StreamController<SyncStatus>.broadcast();
  Stream<SyncStatus> get syncStream => _syncStreamController.stream;

  SyncService({
    required StorageService storage,
    required AuthService auth,
    required GoogleDriveService drive,
  })  : _storage = storage,
        _auth = auth,
        _drive = drive;

  SyncStatus get status => _status;
  String? get lastError => _lastError;
  bool get isSyncing => _isSyncing;

  /// Main sync method: Fetches remote vault from Google Drive, merges with local notes,
  /// saves locally, and uploads the merged state back to Google Drive.
  Future<CloudSyncResult> syncNow({List<Note>? currentLocalNotes}) async {
    if (_isSyncing) {
      throw Exception('Sync already in progress');
    }

    if (!_auth.isAuthenticated) {
      throw Exception('Not signed in to Google Drive');
    }

    _isSyncing = true;
    _status = SyncStatus.syncing;
    _lastError = null;
    _syncStreamController.add(_status);

    try {
      // 1. Search for existing vault file in appDataFolder
      final existingFileId = await _drive.findVaultFileId();
      var downloaded = false;

      // 2. Load local notes & attachments
      var localNotes = currentLocalNotes ?? _storage.loadNotes();
      var localAttachments = _storage.loadAttachments();
      final localSettings = _storage.loadSettings();

      // 3. Download and merge remote vault if exists
      if (existingFileId != null && existingFileId.isNotEmpty) {
        final remoteManifest = await _drive.downloadVault(existingFileId);
        if (remoteManifest != null) {
          final mergeResult = mergeVaultFromCloud(
            localNotes: localNotes,
            remoteNotes: remoteManifest.notes,
            localAttachments: localAttachments,
            remoteAttachments: remoteManifest.noteAttachments,
          );

          localNotes = mergeResult.mergedNotes;
          localAttachments = mergeResult.mergedAttachments;
          downloaded = true;

          // Save merged data to local storage
          await _storage.saveNotes(localNotes);
          await _storage.saveAttachments(localAttachments);
        }
      }

      // 4. Construct current unified BackupManifest
      final manifest = BackupManifest(
        version: 1,
        timestamp: DateTime.now().toUtc().toIso8601String(),
        notes: localNotes,
        noteAttachments: localAttachments,
        settings: localSettings,
      );

      // 5. Upload back to Google Drive
      String uploadedFileId;
      if (existingFileId != null && existingFileId.isNotEmpty) {
        await _drive.updateVaultFile(existingFileId, manifest);
        uploadedFileId = existingFileId;
      } else {
        uploadedFileId = await _drive.createVaultFile(manifest);
      }

      final nowIso = DateTime.now().toUtc().toIso8601String();
      await _storage.setLastSyncTime(nowIso);
      await _storage.setFileId(uploadedFileId);

      final result = CloudSyncResult(
        notesCount: localNotes.length,
        uploaded: true,
        downloaded: downloaded,
        timestamp: nowIso,
      );

      _status = SyncStatus.success;
      _lastError = null;
      _syncStreamController.add(_status);
      return result;
    } catch (e) {
      _status = SyncStatus.error;
      _lastError = e.toString();
      _syncStreamController.add(_status);
      rethrow;
    } finally {
      _isSyncing = false;
    }
  }

  /// Exact 3-way merge algorithm matching desktop Tauri Rust `merge_vault_from_cloud`:
  /// - Compares `updatedAt` timestamps. Later timestamp wins.
  /// - Preserves local-only notes.
  /// - Adds remote-only notes.
  /// - Unites attachments.
  static MergeResult mergeVaultFromCloud({
    required List<Note> localNotes,
    required List<Note> remoteNotes,
    required Map<String, List<NoteAttachmentRow>> localAttachments,
    required Map<String, List<NoteAttachmentRow>> remoteAttachments,
  }) {
    final localMap = {for (final n in localNotes) n.id: n};
    final merged = <Note>[];
    final processedIds = <String>{};
    var changed = false;

    for (final rNote in remoteNotes) {
      processedIds.add(rNote.id);
      final lNote = localMap[rNote.id];

      if (lNote != null) {
        final rTime = _parseTimestamp(rNote.updatedAt);
        final lTime = _parseTimestamp(lNote.updatedAt);

        if (rTime > lTime) {
          merged.add(rNote);
          changed = true;
        } else {
          merged.add(lNote);
        }
      } else {
        merged.add(rNote);
        changed = true;
      }
    }

    for (final entry in localMap.entries) {
      if (!processedIds.contains(entry.key)) {
        merged.add(entry.value);
      }
    }

    // Merge attachments by attachment ID
    final mergedAttachments = Map<String, List<NoteAttachmentRow>>.from(localAttachments);
    remoteAttachments.forEach((noteId, rList) {
      final currentList = mergedAttachments[noteId] ?? <NoteAttachmentRow>[];
      final currentIds = currentList.map((a) => a.id).toSet();

      for (final rAtt in rList) {
        if (!currentIds.contains(rAtt.id)) {
          currentList.add(rAtt);
          changed = true;
        }
      }
      mergedAttachments[noteId] = currentList;
    });

    return MergeResult(
      mergedNotes: merged,
      mergedAttachments: mergedAttachments,
      hasChanged: changed,
    );
  }

  static int _parseTimestamp(String isoString) {
    try {
      return DateTime.parse(isoString).toUtc().millisecondsSinceEpoch;
    } catch (_) {
      return 0;
    }
  }

  void dispose() {
    _syncStreamController.close();
  }
}

class MergeResult {
  final List<Note> mergedNotes;
  final Map<String, List<NoteAttachmentRow>> mergedAttachments;
  final bool hasChanged;

  const MergeResult({
    required this.mergedNotes,
    required this.mergedAttachments,
    required this.hasChanged,
  });
}
