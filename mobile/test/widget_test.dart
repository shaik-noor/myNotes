import 'package:flutter/cupertino.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:mynotes_mobile/main.dart';
import 'package:mynotes_mobile/providers/notes_provider.dart';
import 'package:mynotes_mobile/providers/settings_provider.dart';
import 'package:mynotes_mobile/providers/sync_provider.dart';
import 'package:mynotes_mobile/services/auth_service.dart';
import 'package:mynotes_mobile/services/google_drive_service.dart';
import 'package:mynotes_mobile/services/storage_service.dart';
import 'package:mynotes_mobile/services/sync_service.dart';

void main() {
  testWidgets('App waits for a usable viewport before loading HomeScreen',
      (WidgetTester tester) async {
    tester.view.physicalSize = Size.zero;
    addTearDown(tester.view.resetPhysicalSize);
    SharedPreferences.setMockInitialValues({});
    final storage = await StorageService.init();
    final auth = AuthService(storage);
    final drive = GoogleDriveService(auth);
    final sync = SyncService(storage: storage, auth: auth, drive: drive);

    final settingsProvider = SettingsProvider(storage);
    final syncProvider = SyncProvider(storage: storage, auth: auth, sync: sync);
    final notesProvider = NotesProvider(storage);

    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider.value(value: settingsProvider),
          ChangeNotifierProvider.value(value: syncProvider),
          ChangeNotifierProvider.value(value: notesProvider),
        ],
        child: const MyNotesApp(),
      ),
    );

    await tester.pump();
    expect(tester.takeException(), isNull);

    tester.view.physicalSize = const Size(1080, 2400);
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);

    // Verify app renders header 'MyNotes'
    expect(find.text('MyNotes'), findsWidgets);
  });
}
