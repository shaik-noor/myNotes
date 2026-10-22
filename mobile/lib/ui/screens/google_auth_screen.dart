import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../constants/app_colors.dart';
import '../../providers/notes_provider.dart';
import '../../providers/sync_provider.dart';

class GoogleAuthScreen extends StatefulWidget {
  const GoogleAuthScreen({super.key});

  @override
  State<GoogleAuthScreen> createState() => _GoogleAuthScreenState();
}

class _GoogleAuthScreenState extends State<GoogleAuthScreen> {
  bool _isLoading = false;
  String? _errorMessage;

  Future<void> _handleSignIn() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    HapticFeedback.mediumImpact();

    try {
      final syncProvider = context.read<SyncProvider>();
      final notesProvider = context.read<NotesProvider>();

      await syncProvider.signInWithGoogle(
        onVaultDownloaded: (notes) {
          notesProvider.replaceNotesFromSync(notes);
        },
      );

      if (!mounted) return;
      HapticFeedback.heavyImpact();
      Navigator.of(context).pop();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _errorMessage = e.toString().replaceFirst('Exception: ', '');
      });
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = CupertinoTheme.of(context).brightness == Brightness.dark;
    final bgColor = AppColors.getBackground(isDark);
    final cardBg = AppColors.getCardBackground(isDark);
    final label = AppColors.getLabel(isDark);
    final secondaryLabel = AppColors.getSecondaryLabel(isDark);

    return CupertinoPageScaffold(
      backgroundColor: bgColor,
      navigationBar: CupertinoNavigationBar(
        backgroundColor: bgColor.withOpacity(0.85),
        middle: const Text('Google Drive Sync'),
        leading: CupertinoButton(
          padding: EdgeInsets.zero,
          child: const Text('Cancel'),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          child: Column(
            children: [
              const Spacer(),

              // Cloud Sync Icon Hero
              Container(
                width: 90,
                height: 90,
                decoration: BoxDecoration(
                  color: AppColors.blueLight.withOpacity(0.12),
                  shape: BoxShape.circle,
                ),
                alignment: Alignment.center,
                child: const Icon(
                  CupertinoIcons.cloud_fill,
                  size: 46,
                  color: AppColors.blueLight,
                ),
              ),

              const SizedBox(height: 24),

              Text(
                'Connect to Google Drive',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w700,
                  letterSpacing: -0.5,
                  color: label,
                ),
              ),

              const SizedBox(height: 10),

              Text(
                'Keep your notes and documents automatically synced across your Mac desktop and iOS mobile app.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 15,
                  color: secondaryLabel,
                  height: 1.4,
                ),
              ),

              const SizedBox(height: 32),

              // Feature cards
              _FeatureRow(
                icon: CupertinoIcons.lock_shield_fill,
                title: 'Private AppData Storage',
                description: 'Saved exclusively in your private Google Drive vault (`mynotes_vault.json`).',
                isDark: isDark,
              ),
              const SizedBox(height: 16),
              _FeatureRow(
                icon: CupertinoIcons.arrow_2_circlepath,
                title: 'Bi-directional Realtime Sync',
                description: 'Write on your iPhone and instantly see updates on your desktop workspace.',
                isDark: isDark,
              ),
              const SizedBox(height: 16),
              _FeatureRow(
                icon: CupertinoIcons.wifi_slash,
                title: 'Offline First',
                description: 'Full offline access with automatic background sync as soon as you reconnect.',
                isDark: isDark,
              ),

              const Spacer(),

              if (_errorMessage != null) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: CupertinoColors.systemRed.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(
                    children: [
                      const Icon(CupertinoIcons.exclamationmark_circle_fill,
                          color: CupertinoColors.systemRed, size: 18),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _errorMessage!,
                          style: const TextStyle(
                            fontSize: 13,
                            color: CupertinoColors.systemRed,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],

              // Sign in with Google Button
              SizedBox(
                width: double.infinity,
                child: CupertinoButton.filled(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  onPressed: _isLoading ? null : _handleSignIn,
                  child: _isLoading
                      ? const CupertinoActivityIndicator(color: CupertinoColors.white)
                      : const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(CupertinoIcons.person_crop_circle_badge_checkmark, size: 20),
                            SizedBox(width: 8),
                            Text(
                              'Sign in with Google',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                ),
              ),

              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }
}

class _FeatureRow extends StatelessWidget {
  final IconData icon;
  final String title;
  final String description;
  final bool isDark;

  const _FeatureRow({
    required this.icon,
    required this.title,
    required this.description,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 38,
          height: 38,
          decoration: BoxDecoration(
            color: AppColors.getSecondaryBackground(isDark),
            borderRadius: BorderRadius.circular(10),
          ),
          alignment: Alignment.center,
          child: Icon(icon, size: 19, color: AppColors.blueLight),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                  color: AppColors.getLabel(isDark),
                ),
              ),
              const SizedBox(height: 2),
              Text(
                description,
                style: TextStyle(
                  fontSize: 13,
                  color: AppColors.getSecondaryLabel(isDark),
                  height: 1.3,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
