import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../constants/app_colors.dart';
import '../../providers/sync_provider.dart';
import '../../providers/notes_provider.dart';
import '../screens/google_auth_screen.dart';

class SyncStatusBadge extends StatelessWidget {
  const SyncStatusBadge({super.key});

  @override
  Widget build(BuildContext context) {
    final syncProvider = context.watch<SyncProvider>();
    final notesProvider = context.watch<NotesProvider>();
    final isDark = CupertinoTheme.of(context).brightness == Brightness.dark;

    final isConnected = syncProvider.isConnected;
    final isSyncing = syncProvider.isSyncing;
    final hasError = syncProvider.lastError != null;

    Color badgeColor;
    IconData iconData;

    if (!isConnected) {
      badgeColor = AppColors.getSecondaryLabel(isDark);
      iconData = CupertinoIcons.cloud;
    } else if (isSyncing) {
      badgeColor = AppColors.blueLight;
      iconData = CupertinoIcons.arrow_2_circlepath;
    } else if (hasError) {
      badgeColor = CupertinoColors.systemRed;
      iconData = CupertinoIcons.exclamationmark_triangle_fill;
    } else {
      badgeColor = CupertinoColors.systemGreen;
      iconData = CupertinoIcons.cloud_fill;
    }

    return CupertinoButton(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      onPressed: () {
        HapticFeedback.lightImpact();
        if (!isConnected) {
          Navigator.of(context).push(
            CupertinoPageRoute(
              builder: (_) => const GoogleAuthScreen(),
            ),
          );
        } else {
          // Trigger manual sync or open details
          syncProvider.syncNow(
            currentNotes: notesProvider.notes,
            onVaultMerged: (merged) => notesProvider.replaceNotesFromSync(merged),
          );
        }
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: badgeColor.withOpacity(0.12),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: badgeColor.withOpacity(0.25),
            width: 0.8,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (isSyncing)
              const SizedBox(
                width: 14,
                height: 14,
                child: CupertinoActivityIndicator(radius: 6),
              )
            else
              Icon(iconData, size: 14, color: badgeColor),
            const SizedBox(width: 5),
            Text(
              isSyncing
                  ? 'Syncing'
                  : (!isConnected ? 'Connect' : 'Drive'),
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: badgeColor,
                letterSpacing: -0.2,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
