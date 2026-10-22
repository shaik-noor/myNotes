import 'package:flutter/cupertino.dart';
import '../models/note.dart';
import '../models/sync_result.dart';
import '../services/auth_service.dart';
import '../services/storage_service.dart';
import '../services/sync_service.dart';

class SyncProvider extends ChangeNotifier {
  final StorageService _storage;
  final AuthService _auth;
  final SyncService _sync;

  bool _isSyncing = false;
  String? _lastError;
  String? _lastSyncTime;
  CloudSyncResult? _lastResult;

  SyncProvider({
    required StorageService storage,
    required AuthService auth,
    required SyncService sync,
  })  : _storage = storage,
        _auth = auth,
        _sync = sync {
    _lastSyncTime = _storage.getLastSyncTime();
    _sync.syncStream.listen((status) {
      _isSyncing = (status == SyncStatus.syncing);
      _lastError = _sync.lastError;
      if (status == SyncStatus.success) {
        _lastSyncTime = _storage.getLastSyncTime();
      }
      notifyListeners();
    });
  }

  bool get isConnected => _auth.isAuthenticated;
  bool get isSyncing => _isSyncing;
  String? get lastError => _lastError;
  String? get lastSyncTime => _lastSyncTime;
  String? get userEmail => _storage.getUserEmail();
  String? get userName => _storage.getUserName();
  String? get userPicture => _storage.getUserPicture();
  bool get autoSync => _storage.getAutoSync();
  CloudSyncResult? get lastResult => _lastResult;

  Future<void> toggleAutoSync(bool value) async {
    await _storage.setAutoSync(value);
    notifyListeners();
  }

  Future<void> signInWithGoogle({Function(List<Note>)? onVaultDownloaded}) async {
    _isSyncing = true;
    _lastError = null;
    notifyListeners();

    try {
      await _auth.signInWithGoogle();
      // Immediately perform initial sync to pull remote Google Drive vault
      final res = await _sync.syncNow();
      _lastResult = res;
      _lastSyncTime = _storage.getLastSyncTime();
      if (onVaultDownloaded != null) {
        onVaultDownloaded(_storage.loadNotes());
      }
    } catch (e) {
      _lastError = e.toString();
      rethrow;
    } finally {
      _isSyncing = false;
      notifyListeners();
    }
  }

  Future<void> signOut() async {
    await _auth.signOut();
    _lastSyncTime = null;
    notifyListeners();
  }

  Future<CloudSyncResult?> syncNow({List<Note>? currentNotes, Function(List<Note>)? onVaultMerged}) async {
    if (!isConnected) return null;

    try {
      final res = await _sync.syncNow(currentLocalNotes: currentNotes);
      _lastResult = res;
      _lastSyncTime = _storage.getLastSyncTime();
      _lastError = null;
      if (onVaultMerged != null) {
        onVaultMerged(_storage.loadNotes());
      }
      notifyListeners();
      return res;
    } catch (e) {
      _lastError = e.toString();
      notifyListeners();
      return null;
    }
  }
}
