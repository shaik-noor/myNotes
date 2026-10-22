// These isolated review tests live outside test/ to preserve the baseline suite.
// Mock preferences are only used by flutter_test executions of this file.
// ignore_for_file: invalid_use_of_visible_for_testing_member

import 'dart:async';
import 'package:flutter/cupertino.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:mynotes_mobile/main.dart';
import 'package:mynotes_mobile/models/backup_manifest.dart';
import 'package:mynotes_mobile/models/note.dart';
import 'package:mynotes_mobile/providers/notes_provider.dart';
import 'package:mynotes_mobile/providers/settings_provider.dart';
import 'package:mynotes_mobile/providers/sync_provider.dart';
import 'package:mynotes_mobile/services/auth_service.dart';
import 'package:mynotes_mobile/services/google_drive_service.dart';
import 'package:mynotes_mobile/services/storage_service.dart';
import 'package:mynotes_mobile/services/sync_service.dart';
import 'package:mynotes_mobile/ui/widgets/interactive_task_view.dart';

const seed = Note(
    id: 'n',
    title: 'Original',
    content: '- [ ] Task',
    createdAt: '2026-10-21T00:00:00Z',
    updatedAt: '2026-10-21T00:00:00Z',
    coverImage: 'cover');

class DelayedDrive extends GoogleDriveService {
  DelayedDrive(super.auth);
  final started = Completer<void>();
  final remote = Completer<BackupManifest?>();
  @override
  Future<String?> findVaultFileId() async => 'vault';
  @override
  Future<BackupManifest?> downloadVault(String fileId) {
    started.complete();
    return remote.future;
  }

  @override
  Future<void> updateVaultFile(String fileId, BackupManifest manifest) async {}
}

void main() {
  test('cover can be cleared through copyWith', () {
    expect(seed.copyWith(coverImage: null).coverImage, isNull);
  });

  test('deleted synced note stays deleted after next sync', () async {
    SharedPreferences.setMockInitialValues({});
    final storage = await StorageService.init();
    await storage.saveNotes([seed]);
    final notes = NotesProvider(storage);
    await notes.deleteNote(seed.id);
    final merged = SyncService.mergeVaultFromCloud(
        localNotes: notes.notes,
        remoteNotes: [seed],
        localAttachments: {},
        remoteAttachments: {});
    expect(merged.mergedNotes, isEmpty);
    notes.dispose();
  });

  test('edit made during initial sign-in download survives sync', () async {
    SharedPreferences.setMockInitialValues({});
    final storage = await StorageService.init();
    await storage.setRefreshToken('fake-local-test-token');
    await storage.saveNotes([seed]);
    final auth = AuthService(storage);
    final drive = DelayedDrive(auth);
    final service = SyncService(storage: storage, auth: auth, drive: drive);
    final notes = NotesProvider(storage);
    // SyncProvider.signInWithGoogle invokes syncNow without currentLocalNotes.
    final pending = service.syncNow();
    await drive.started.future;
    await notes.updateNote(seed.copyWith(content: 'New local edit'));
    drive.remote
        .complete(BackupManifest(timestamp: seed.updatedAt, notes: [seed]));
    await pending;
    expect(storage.loadNotes().single.content, 'New local edit');
    notes.dispose();
    service.dispose();
  });

  testWidgets('checklist tap updates markdown', (tester) async {
    String? changed;
    await tester.pumpWidget(CupertinoApp(
        home: CupertinoPageScaffold(
            child: InteractiveTaskView(
                content: seed.content, onContentChanged: (s) => changed = s))));
    await tester.tap(find.byType(CupertinoCheckbox));
    await tester.pump();
    expect(changed, '- [x] Task');
  });

  testWidgets('create edit and close editor without framework errors',
      (tester) async {
    SharedPreferences.setMockInitialValues({});
    final storage = await StorageService.init();
    final auth = AuthService(storage);
    final service = SyncService(
        storage: storage, auth: auth, drive: GoogleDriveService(auth));
    final notes = NotesProvider(storage);
    final sync = SyncProvider(storage: storage, auth: auth, sync: service);
    final settings = SettingsProvider(storage);
    await tester.pumpWidget(MultiProvider(providers: [
      ChangeNotifierProvider.value(value: notes),
      ChangeNotifierProvider.value(value: sync),
      ChangeNotifierProvider.value(value: settings),
    ], child: const MyNotesApp()));
    await tester.pumpAndSettle();
    await tester.tap(find.text('New Note'));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    await tester.enterText(
        find.byType(CupertinoTextField).last, 'Draft before leaving');
    await tester.tap(find.text('Notes').first);
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    expect(storage.loadNotes().single.content, 'Draft before leaving');
  });
}
