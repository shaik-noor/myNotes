import 'package:flutter_test/flutter_test.dart';
import 'package:mynotes_mobile/models/note.dart';

void main() {
  group('Note Model Tests', () {
    test('Serializes and deserializes note accurately', () {
      final note = Note(
        id: 'test-note-1',
        title: 'Meeting Notes',
        content: '# Objectives\n- [ ] Task 1',
        createdAt: '2026-10-21T10:00:00.000Z',
        updatedAt: '2026-10-21T10:30:00.000Z',
        icon: '📋',
        coverImage: 'bg-gradient-sunset',
        pinned: true,
        tags: ['work', 'meeting'],
        fullWidth: false,
        parentId: null,
      );

      final json = note.toJson();
      expect(json['id'], 'test-note-1');
      expect(json['title'], 'Meeting Notes');
      expect(json['icon'], '📋');
      expect(json['pinned'], true);
      expect(json['tags'], ['work', 'meeting']);

      final fromJson = Note.fromJson(json);
      expect(fromJson.id, note.id);
      expect(fromJson.title, note.title);
      expect(fromJson.content, note.content);
      expect(fromJson.icon, note.icon);
      expect(fromJson.coverImage, note.coverImage);
      expect(fromJson.isPinned, true);
      expect(fromJson.tagList, ['work', 'meeting']);
    });

    test('copyWith updates properties correctly', () {
      const note = Note(
        id: 'note-1',
        title: 'Original Title',
        content: 'Original Content',
        createdAt: '2026-10-21T10:00:00Z',
        updatedAt: '2026-10-21T10:00:00Z',
      );

      final updated = note.copyWith(
        title: 'Updated Title',
        pinned: true,
      );

      expect(updated.title, 'Updated Title');
      expect(updated.content, 'Original Content');
      expect(updated.isPinned, true);
    });
  });
}
