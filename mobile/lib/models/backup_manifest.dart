import 'note.dart';
import 'attachment.dart';
import 'app_settings.dart';

/// The exact vault format stored in Google Drive `appDataFolder/mynotes_vault.json`
/// and exported by the desktop app.
class BackupManifest {
  final int version;
  final String timestamp;
  final List<Note> notes;
  final Map<String, List<NoteAttachmentRow>> noteAttachments;
  final AppSettings? settings;

  const BackupManifest({
    this.version = 1,
    required this.timestamp,
    required this.notes,
    this.noteAttachments = const {},
    this.settings,
  });

  Map<String, dynamic> toJson() {
    final attachmentsJson = <String, dynamic>{};
    noteAttachments.forEach((key, list) {
      attachmentsJson[key] = list.map((a) => a.toJson()).toList();
    });

    return {
      'version': version,
      'timestamp': timestamp,
      'notes': notes.map((n) => n.toJson()).toList(),
      'noteAttachments': attachmentsJson,
      if (settings != null) 'settings': settings!.toJson(),
    };
  }

  factory BackupManifest.fromJson(Map<String, dynamic> json) {
    final version = json['version'] as int? ?? 1;
    final timestamp = json['timestamp'] as String? ?? DateTime.now().toUtc().toIso8601String();

    final notesRaw = json['notes'] as List? ?? [];
    final notes = notesRaw
        .whereType<Map<String, dynamic>>()
        .map((n) => Note.fromJson(n))
        .toList();

    final attachmentsMap = <String, List<NoteAttachmentRow>>{};
    final attachmentsRaw = json['noteAttachments'] as Map<String, dynamic>? ?? {};
    attachmentsRaw.forEach((noteId, list) {
      if (list is List) {
        attachmentsMap[noteId] = list
            .whereType<Map<String, dynamic>>()
            .map((a) => NoteAttachmentRow.fromJson(a))
            .toList();
      }
    });

    AppSettings? settings;
    if (json['settings'] != null && json['settings'] is Map<String, dynamic>) {
      settings = AppSettings.fromJson(json['settings'] as Map<String, dynamic>);
    }

    return BackupManifest(
      version: version,
      timestamp: timestamp,
      notes: notes,
      noteAttachments: attachmentsMap,
      settings: settings,
    );
  }
}
