import 'package:flutter/cupertino.dart';
import '../../constants/app_colors.dart';
import '../../constants/banner_presets.dart';

class EmojiPickerSheet extends StatelessWidget {
  final String? currentEmoji;
  final ValueChanged<String?> onSelectEmoji;

  const EmojiPickerSheet({
    super.key,
    this.currentEmoji,
    required this.onSelectEmoji,
  });

  static Future<void> show(
    BuildContext context, {
    String? currentEmoji,
    required ValueChanged<String?> onSelectEmoji,
  }) {
    return showCupertinoModalPopup<void>(
      context: context,
      builder: (ctx) => EmojiPickerSheet(
        currentEmoji: currentEmoji,
        onSelectEmoji: (e) {
          onSelectEmoji(e);
          Navigator.of(ctx).pop();
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = CupertinoTheme.of(context).brightness == Brightness.dark;
    final bg = AppColors.getCardBackground(isDark);

    return Container(
      height: 380,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: SafeArea(
        top: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Choose Note Icon',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: AppColors.getLabel(isDark),
                    letterSpacing: -0.4,
                  ),
                ),
                if (currentEmoji != null && currentEmoji!.isNotEmpty)
                  CupertinoButton(
                    padding: EdgeInsets.zero,
                    onPressed: () => onSelectEmoji(null),
                    child: const Text(
                      'Remove',
                      style: TextStyle(
                        fontSize: 15,
                        color: CupertinoColors.systemRed,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 16),
            Expanded(
              child: GridView.builder(
                itemCount: BannerPresets.presetEmojis.length,
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 6,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                ),
                itemBuilder: (context, index) {
                  final emoji = BannerPresets.presetEmojis[index];
                  final isSelected = currentEmoji == emoji;

                  return GestureDetector(
                    onTap: () => onSelectEmoji(emoji),
                    child: Container(
                      decoration: BoxDecoration(
                        color: isSelected
                            ? AppColors.blueLight.withOpacity(0.18)
                            : AppColors.getSecondaryBackground(isDark),
                        borderRadius: BorderRadius.circular(12),
                        border: isSelected
                            ? Border.all(color: AppColors.blueLight, width: 2)
                            : null,
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        emoji,
                        style: const TextStyle(fontSize: 26),
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
