import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:mynotes_mobile/models/note.dart';
import 'package:mynotes_mobile/providers/notes_provider.dart';
import 'package:mynotes_mobile/services/storage_service.dart';

void main() {
  test('notebook deletion persists offline across provider reloads', () async {
    SharedPreferences.setMockInitialValues({});
    final storage = StorageService(await SharedPreferences.getInstance());
    await storage.saveNotes([
      Note(
          id: 'book', title: 'Book', content: '', createdAt: '', updatedAt: ''),
      Note(
          id: 'page',
          parentId: 'book',
          title: 'Page',
          content: '',
          createdAt: '',
          updatedAt: ''),
    ]);
    final provider = NotesProvider(storage);
    await provider.deleteNote('book');
    expect(provider.notes, isEmpty);
    expect(storage.loadDeletedNoteIds(), {'book', 'page'});
    final reloaded = NotesProvider(storage);
    expect(reloaded.notes, isEmpty);
    // A late write from an old snapshot must remain hidden on startup.
    await storage.saveNotes([
      Note(
          id: 'book', title: 'Book', content: '', createdAt: '', updatedAt: ''),
    ]);
    expect(storage.loadNotes(), isEmpty);
    provider.dispose();
    reloaded.dispose();
  });
}
