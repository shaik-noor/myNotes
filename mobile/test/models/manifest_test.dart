import 'package:flutter_test/flutter_test.dart';
import 'package:mynotes_mobile/models/note.dart';
import 'package:mynotes_mobile/models/attachment.dart';
import 'package:mynotes_mobile/models/backup_manifest.dart';
import 'package:mynotes_mobile/models/app_settings.dart';

void main() {
  test('deletion records round-trip and old vaults remain readable', () {
    final old = BackupManifest.fromJson({'version': 1, 'notes': []});
    expect(old.deletedNoteIds, isEmpty);
    final manifest = BackupManifest(
        timestamp: '',
        notes: [],
        deletedNoteIds: {'page'},
        deletedAttachmentIds: {'file'});
    final restored = BackupManifest.fromJson(manifest.toJson());
    expect(restored.deletedNoteIds, {'page'});
    expect(restored.deletedAttachmentIds, {'file'});
  });

  group('BackupManifest Tests', () {
    test(
        'Serializes and deserializes full manifest compatible with desktop vault',
        () {
      final note = Note(
        id: 'note-1',
        title: 'Project Spec',
        content: 'Content',
        createdAt: '2026-10-21T10:00:00Z',
        updatedAt: '2026-10-21T10:00:00Z',
      );

      final attachment = NoteAttachmentRow(
        id: 'att-1',
        noteId: 'note-1',
        name: 'diagram.png',
        kind: 'image',
        data: 'base64data',
      );

      final manifest = BackupManifest(
        version: 1,
        timestamp: '2026-10-21T12:00:00Z',
        notes: [note],
        noteAttachments: {
          'note-1': [attachment],
        },
        settings: const AppSettings(
          theme: 'dark',
          palette: 'rose',
        ),
      );

      final json = manifest.toJson();
      expect(json['version'], 1);
      expect(json['timestamp'], '2026-10-21T12:00:00Z');
      expect((json['notes'] as List).length, 1);
      expect((json['noteAttachments'] as Map)['note-1'], isNotNull);

      final parsed = BackupManifest.fromJson(json);
      expect(parsed.version, 1);
      expect(parsed.notes.length, 1);
      expect(parsed.notes.first.title, 'Project Spec');
      expect(parsed.noteAttachments['note-1']?.first.name, 'diagram.png');
      expect(parsed.settings?.palette, 'rose');
    });
  });
}
