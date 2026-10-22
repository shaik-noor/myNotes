import 'package:flutter_test/flutter_test.dart';
import 'package:mynotes_mobile/models/note.dart';
import 'package:mynotes_mobile/models/attachment.dart';
import 'package:mynotes_mobile/services/sync_service.dart';

void main() {
  group('Conflict Resolution & Cloud Merge Tests', () {
    test('Newer remote note wins over older local note', () {
      const local = Note(
        id: 'note-1',
        title: 'Local Older Title',
        content: 'Local text',
        createdAt: '2026-10-21T10:00:00Z',
        updatedAt: '2026-10-21T11:00:00Z',
      );

      const remote = Note(
        id: 'note-1',
        title: 'Remote Newer Title',
        content: 'Remote updated text from Desktop',
        createdAt: '2026-10-21T10:00:00Z',
        updatedAt: '2026-10-21T11:05:00Z', // 5 minutes newer
      );

      final result = SyncService.mergeVaultFromCloud(
        localNotes: [local],
        remoteNotes: [remote],
        localAttachments: {},
        remoteAttachments: {},
      );

      expect(result.hasChanged, true);
      expect(result.mergedNotes.length, 1);
      expect(result.mergedNotes.first.title, 'Remote Newer Title');
      expect(result.mergedNotes.first.content, 'Remote updated text from Desktop');
    });

    test('Newer local note wins over older remote note', () {
      const local = Note(
        id: 'note-1',
        title: 'Local Newer Title',
        content: 'Local newest text on iPhone',
        createdAt: '2026-10-21T10:00:00Z',
        updatedAt: '2026-10-21T12:00:00Z', // 1 hour newer
      );

      const remote = Note(
        id: 'note-1',
        title: 'Remote Stale Title',
        content: 'Remote stale text',
        createdAt: '2026-10-21T10:00:00Z',
        updatedAt: '2026-10-21T11:00:00Z',
      );

      final result = SyncService.mergeVaultFromCloud(
        localNotes: [local],
        remoteNotes: [remote],
        localAttachments: {},
        remoteAttachments: {},
      );

      expect(result.mergedNotes.length, 1);
      expect(result.mergedNotes.first.title, 'Local Newer Title');
      expect(result.mergedNotes.first.content, 'Local newest text on iPhone');
    });

    test('Non-overlapping notes from both local and remote are united', () {
      const localOnly = Note(
        id: 'local-note-1',
        title: 'Note created on iPhone',
        content: 'iPhone draft',
        createdAt: '2026-10-21T10:00:00Z',
        updatedAt: '2026-10-21T10:00:00Z',
      );

      const remoteOnly = Note(
        id: 'desktop-note-2',
        title: 'Note created on Mac Desktop',
        content: 'Mac content',
        createdAt: '2026-10-21T10:05:00Z',
        updatedAt: '2026-10-21T10:05:00Z',
      );

      final result = SyncService.mergeVaultFromCloud(
        localNotes: [localOnly],
        remoteNotes: [remoteOnly],
        localAttachments: {},
        remoteAttachments: {},
      );

      expect(result.hasChanged, true);
      expect(result.mergedNotes.length, 2);
      final titles = result.mergedNotes.map((n) => n.title).toList();
      expect(titles, contains('Note created on iPhone'));
      expect(titles, contains('Note created on Mac Desktop'));
    });

    test('Attachments from cloud are merged into local vault', () {
      const att1 = NoteAttachmentRow(
        id: 'att-1',
        noteId: 'note-1',
        name: 'photo.jpg',
      );

      const att2 = NoteAttachmentRow(
        id: 'att-2',
        noteId: 'note-1',
        name: 'receipt.pdf',
      );

      final result = SyncService.mergeVaultFromCloud(
        localNotes: [],
        remoteNotes: [],
        localAttachments: {
          'note-1': [att1],
        },
        remoteAttachments: {
          'note-1': [att2],
        },
      );

      expect(result.hasChanged, true);
      final list = result.mergedAttachments['note-1']!;
      expect(list.length, 2);
      final names = list.map((a) => a.name).toList();
      expect(names, contains('photo.jpg'));
      expect(names, contains('receipt.pdf'));
    });
  });
}
