import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import 'providers/notes_provider.dart';
import 'providers/settings_provider.dart';
import 'providers/sync_provider.dart';
import 'services/auth_service.dart';
import 'services/google_drive_service.dart';
import 'services/storage_service.dart';
import 'services/sync_service.dart';
import 'ui/screens/home_screen.dart';
import 'ui/theme/ios_theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Set iOS system UI overlay style
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: CupertinoColors.transparent,
      statusBarBrightness: Brightness.dark,
    ),
  );

  // Initialize storage & services
  final storage = await StorageService.init();
  final authService = AuthService(storage);
  final driveService = GoogleDriveService(authService);
  final syncService = SyncService(
    storage: storage,
    auth: authService,
    drive: driveService,
  );

  final settingsProvider = SettingsProvider(storage);
  final syncProvider = SyncProvider(
    storage: storage,
    auth: authService,
    sync: syncService,
  );
  final notesProvider = NotesProvider(storage);

  // Link notes provider to sync provider for reactive auto-sync
  notesProvider.attachSyncProvider(syncProvider);

  // Perform non-blocking sync on app launch if authenticated
  if (syncProvider.isConnected) {
    syncProvider.syncNow(
      currentNotes: notesProvider.notes,
      onVaultMerged: (merged) {
        notesProvider.replaceNotesFromSync(merged);
      },
    );
  }

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: settingsProvider),
        ChangeNotifierProvider.value(value: syncProvider),
        ChangeNotifierProvider.value(value: notesProvider),
      ],
      child: const MyNotesApp(),
    ),
  );
}

class MyNotesApp extends StatelessWidget {
  const MyNotesApp({super.key});

  @override
  Widget build(BuildContext context) {
    final settingsProvider = context.watch<SettingsProvider>();
    final isDark = settingsProvider.isDarkMode(context);

    return CupertinoApp(
      title: 'MyNotes',
      debugShowCheckedModeBanner: false,
      builder: (context, child) {
        // Android may report an empty viewport before its first surface is ready.
        // Defer layout until controls have a usable screen size.
        if (MediaQuery.sizeOf(context).isEmpty) {
          return const SizedBox.shrink();
        }
        return child ?? const SizedBox.shrink();
      },
      theme: IosTheme.getCupertinoTheme(
        isDark: isDark,
        palette: settingsProvider.palette,
      ),
      home: const HomeScreen(),
    );
  }
}
