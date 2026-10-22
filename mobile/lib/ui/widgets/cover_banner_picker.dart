import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import '../../constants/app_colors.dart';
import '../../constants/banner_presets.dart';

class CoverBannerPicker extends StatelessWidget {
  final String? currentCover;
  final ValueChanged<String?> onSelectCover;

  const CoverBannerPicker({
    super.key,
    this.currentCover,
    required this.onSelectCover,
  });

  static Future<void> show(
    BuildContext context, {
    String? currentCover,
    required ValueChanged<String?> onSelectCover,
  }) {
    return showCupertinoModalPopup<void>(
      context: context,
      builder: (ctx) => CoverBannerPicker(
        currentCover: currentCover,
        onSelectCover: (c) {
          onSelectCover(c);
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
            // Header bar
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Choose Cover Banner',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: AppColors.getLabel(isDark),
                    letterSpacing: -0.4,
                  ),
                ),
                if (currentCover != null && currentCover!.isNotEmpty)
                  CupertinoButton(
                    padding: EdgeInsets.zero,
                    onPressed: () => onSelectCover(null),
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

            // Gradients Grid
            Expanded(
              child: GridView.builder(
                itemCount: BannerPresets.gradients.length,
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                  childAspectRatio: 2.2,
                ),
                itemBuilder: (context, index) {
                  final preset = BannerPresets.gradients[index];
                  final isSelected = currentCover == preset.id;

                  return GestureDetector(
                    onTap: () => onSelectCover(preset.id),
                    child: Container(
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(12),
                        gradient: LinearGradient(
                          colors: preset.colors,
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        border: isSelected
                            ? Border.all(color: CupertinoColors.white, width: 2.5)
                            : null,
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.15),
                            blurRadius: 4,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        preset.name,
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: CupertinoColors.white,
                          shadows: [
                            Shadow(
                              color: Colors.black45,
                              blurRadius: 4,
                            ),
                          ],
                        ),
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
