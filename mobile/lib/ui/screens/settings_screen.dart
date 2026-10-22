import 'dart:convert';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';
import '../../constants/app_colors.dart';
import '../../models/backup_manifest.dart';
import '../../providers/notes_provider.dart';
import '../../providers/sync_provider.dart';
import '../../providers/settings_provider.dart';
import 'google_auth_screen.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final settingsProvider = context.watch<SettingsProvider>();
    final syncProvider = context.watch<SyncProvider>();
    final notesProvider = context.watch<NotesProvider>();
    final isDark = settingsProvider.isDarkMode(context);

    final bgColor = AppColors.getBackground(isDark);
    final cardBg = AppColors.getCardBackground(isDark);
    final label = AppColors.getLabel(isDark);
    final secondaryLabel = AppColors.getSecondaryLabel(isDark);
    final accentColor = AppColors.getAccent(settingsProvider.palette, isDark);

    return CupertinoPageScaffold(
      backgroundColor: bgColor,
      navigationBar: CupertinoNavigationBar(
        backgroundColor: bgColor.withOpacity(0.85),
        middle: const Text('Settings'),
      ),
      child: SafeArea(
        child: ListView(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          children: [
            // 1. Google Drive Cloud Sync Section
            _SectionHeader(title: 'CLOUD SYNC', labelColor: secondaryLabel),
            Container(
              decoration: BoxDecoration(
                color: cardBg,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: AppColors.getSeparator(isDark).withOpacity(0.5),
                  width: 0.5,
                ),
              ),
              child: Column(
                children: [
                  if (syncProvider.isConnected) ...[
                    // Account Profile Row
                    Padding(
                      padding: const EdgeInsets.all(16),
                      child: Row(
                        children: [
                          Container(
                            width: 46,
                            height: 46,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: AppColors.blueLight.withOpacity(0.15),
                            ),
                            alignment: Alignment.center,
                            child: syncProvider.userPicture != null
                                ? ClipRRect(
                                    borderRadius: BorderRadius.circular(23),
                                    child: Image.network(
                                      syncProvider.userPicture!,
                                      width: 46,
                                      height: 46,
                                      fit: BoxFit.cover,
                                      errorBuilder: (_, __, ___) => const Icon(
                                        CupertinoIcons.person_fill,
                                        size: 24,
                                        color: AppColors.blueLight,
                                      ),
                                    ),
                                  )
                                : const Icon(
                                    CupertinoIcons.person_fill,
                                    size: 24,
                                    color: AppColors.blueLight,
                                  ),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  syncProvider.userName ?? 'Google Drive User',
                                  style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w600,
                                    color: label,
                                    letterSpacing: -0.3,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  syncProvider.userEmail ?? '',
                                  style: TextStyle(
                                    fontSize: 13,
                                    color: secondaryLabel,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: CupertinoColors.systemGreen.withOpacity(0.12),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Text(
                              'Connected',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: CupertinoColors.systemGreen,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const Divider(height: 1),

                    // Last Synced Status
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('Last Synced', style: TextStyle(fontSize: 15, color: label)),
                          Text(
                            syncProvider.lastSyncTime != null
                                ? syncProvider.lastSyncTime!.substring(0, 16).replaceFirst('T', ' ')
                                : 'Just now',
                            style: TextStyle(fontSize: 14, color: secondaryLabel),
                          ),
                        ],
                      ),
                    ),
                    const Divider(height: 1),

                    // Auto-Sync Toggle
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('Automatic Sync', style: TextStyle(fontSize: 15, color: label)),
                          CupertinoSwitch(
                            value: syncProvider.autoSync,
                            activeColor: accentColor,
                            onChanged: (v) => syncProvider.toggleAutoSync(v),
                          ),
                        ],
                      ),
                    ),
                    const Divider(height: 1),

                    // Sync Now Button
                    CupertinoButton(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      onPressed: syncProvider.isSyncing
                          ? null
                          : () {
                              HapticFeedback.mediumImpact();
                              syncProvider.syncNow(
                                currentNotes: notesProvider.notes,
                                onVaultMerged: (merged) => notesProvider.replaceNotesFromSync(merged),
                              );
                            },
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          if (syncProvider.isSyncing) ...[
                            const CupertinoActivityIndicator(radius: 8),
                            const SizedBox(width: 8),
                          ] else
                            Icon(CupertinoIcons.arrow_2_circlepath, size: 18, color: accentColor),
                          const SizedBox(width: 8),
                          Text(
                            syncProvider.isSyncing ? 'Syncing...' : 'Sync with Google Drive Now',
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w600,
                              color: accentColor,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const Divider(height: 1),

                    // Disconnect / Revoke
                    CupertinoButton(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      onPressed: () {
                        HapticFeedback.heavyImpact();
                        showCupertinoDialog<void>(
                          context: context,
                          builder: (ctx) => CupertinoAlertDialog(
                            title: const Text('Disconnect Google Drive?'),
                            content: const Text(
                              'This will disconnect your account from this device. Your notes on Google Drive will remain safe.',
                            ),
                            actions: [
                              CupertinoDialogAction(
                                isDefaultAction: true,
                                child: const Text('Cancel'),
                                onPressed: () => Navigator.of(ctx).pop(),
                              ),
                              CupertinoDialogAction(
                                isDestructiveAction: true,
                                child: const Text('Disconnect'),
                                onPressed: () {
                                  syncProvider.signOut();
                                  Navigator.of(ctx).pop();
                                },
                              ),
                            ],
                          ),
                        );
                      },
                      child: const Text(
                        'Disconnect Google Drive',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          color: CupertinoColors.systemRed,
                        ),
                      ),
                    ),
                  ] else ...[
                    // Not Connected State
                    Padding(
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        children: [
                          const Icon(
                            CupertinoIcons.cloud,
                            size: 44,
                            color: AppColors.blueLight,
                          ),
                          const SizedBox(height: 12),
                          Text(
                            'Connect Google Drive',
                            style: TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.w700,
                              color: label,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            'Seamlessly sync your notes between your Mac desktop app and iOS mobile app.',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 13,
                              color: secondaryLabel,
                              height: 1.4,
                            ),
                          ),
                          const SizedBox(height: 16),
                          CupertinoButton.filled(
                            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 10),
                            onPressed: () {
                              Navigator.of(context).push(
                                CupertinoPageRoute(
                                  builder: (_) => const GoogleAuthScreen(),
                                ),
                              );
                            },
                            child: const Text('Sign in with Google'),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),

            const SizedBox(height: 24),

            // 2. Appearance Section
            _SectionHeader(title: 'APPEARANCE', labelColor: secondaryLabel),
            Container(
              decoration: BoxDecoration(
                color: cardBg,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: AppColors.getSeparator(isDark).withOpacity(0.5),
                  width: 0.5,
                ),
              ),
              child: Column(
                children: [
                  // Theme Selector
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Theme', style: TextStyle(fontSize: 15, color: label)),
                        SizedBox(
                          width: 200,
                          child: CupertinoSlidingSegmentedControl<String>(
                            groupValue: settingsProvider.theme,
                            children: const {
                              'system': Padding(
                                padding: EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                                child: Text('System', style: TextStyle(fontSize: 12)),
                              ),
                              'light': Padding(
                                padding: EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                                child: Text('Light', style: TextStyle(fontSize: 12)),
                              ),
                              'dark': Padding(
                                padding: EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                                child: Text('Dark', style: TextStyle(fontSize: 12)),
                              ),
                            },
                            onValueChanged: (val) {
                              if (val != null) {
                                HapticFeedback.selectionClick();
                                settingsProvider.updateTheme(val);
                              }
                            },
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Divider(height: 1),

                  // Accent Palette
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Accent Palette', style: TextStyle(fontSize: 15, color: label)),
                        const SizedBox(height: 12),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceAround,
                          children: [
                            _PaletteCircle(
                              paletteName: 'blue',
                              color: AppColors.blueLight,
                              isSelected: settingsProvider.palette == 'blue',
                              onTap: () => settingsProvider.updatePalette('blue'),
                            ),
                            _PaletteCircle(
                              paletteName: 'purple',
                              color: AppColors.purpleLight,
                              isSelected: settingsProvider.palette == 'purple',
                              onTap: () => settingsProvider.updatePalette('purple'),
                            ),
                            _PaletteCircle(
                              paletteName: 'amber',
                              color: AppColors.amberLight,
                              isSelected: settingsProvider.palette == 'amber',
                              onTap: () => settingsProvider.updatePalette('amber'),
                            ),
                            _PaletteCircle(
                              paletteName: 'emerald',
                              color: AppColors.emeraldLight,
                              isSelected: settingsProvider.palette == 'emerald',
                              onTap: () => settingsProvider.updatePalette('emerald'),
                            ),
                            _PaletteCircle(
                              paletteName: 'rose',
                              color: AppColors.roseLight,
                              isSelected: settingsProvider.palette == 'rose',
                              onTap: () => settingsProvider.updatePalette('rose'),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // 3. Vault & Backup Section
            _SectionHeader(title: 'BACKUP & EXPORT', labelColor: secondaryLabel),
            Container(
              decoration: BoxDecoration(
                color: cardBg,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: AppColors.getSeparator(isDark).withOpacity(0.5),
                  width: 0.5,
                ),
              ),
              child: Column(
                children: [
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Total Notes in Vault', style: TextStyle(fontSize: 15, color: label)),
                        Text(
                          '${notesProvider.notes.length}',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            color: label,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Divider(height: 1),

                  // Export Vault JSON
                  CupertinoButton(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    onPressed: () {
                      HapticFeedback.lightImpact();
                      final manifest = BackupManifest(
                        version: 1,
                        timestamp: DateTime.now().toUtc().toIso8601String(),
                        notes: notesProvider.notes,
                        settings: settingsProvider.settings,
                      );
                      final jsonString = jsonEncode(manifest.toJson());
                      Share.share(jsonString, subject: 'MyNotes-Vault-Backup.json');
                    },
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(CupertinoIcons.square_arrow_up, size: 18, color: accentColor),
                        const SizedBox(width: 8),
                        Text(
                          'Export Vault JSON Backup',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            color: accentColor,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // 4. About Section
            Center(
              child: Column(
                children: [
                  Text(
                    'MyNotes for iOS',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: secondaryLabel,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Version 1.2.3 · Built with Flutter',
                    style: TextStyle(
                      fontSize: 12,
                      color: secondaryLabel.withOpacity(0.8),
                    ),
                  ),
                  const SizedBox(height: 40),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  final Color labelColor;

  const _SectionHeader({required this.title, required this.labelColor});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(left: 12, bottom: 6),
      child: Text(
        title,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: labelColor,
          letterSpacing: 0.5,
        ),
      ),
    );
  }
}

class _PaletteCircle extends StatelessWidget {
  final String paletteName;
  final Color color;
  final bool isSelected;
  final VoidCallback onTap;

  const _PaletteCircle({
    required this.paletteName,
    required this.color,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        HapticFeedback.selectionClick();
        onTap();
      },
      child: Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(
          color: color,
          shape: BoxShape.circle,
          border: isSelected
              ? Border.all(color: CupertinoColors.white, width: 3)
              : null,
          boxShadow: [
            if (isSelected)
              BoxShadow(
                color: color.withOpacity(0.5),
                blurRadius: 8,
                spreadRadius: 1,
              ),
          ],
        ),
        child: isSelected
            ? const Icon(
                CupertinoIcons.checkmark,
                size: 16,
                color: CupertinoColors.white,
              )
            : null,
      ),
    );
  }
}
