import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import '../../constants/app_colors.dart';
import '../../constants/note_templates.dart';

class TemplatesScreen extends StatelessWidget {
  final Function(NoteTemplate template) onUseTemplate;

  const TemplatesScreen({super.key, required this.onUseTemplate});

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
        middle: const Text('Note Templates'),
      ),
      child: SafeArea(
        child: ListView.builder(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          itemCount: NoteTemplates.templates.length,
          itemBuilder: (context, index) {
            final template = NoteTemplates.templates[index];

            return Container(
              margin: const EdgeInsets.only(bottom: 12),
              decoration: BoxDecoration(
                color: cardBg,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: AppColors.getSeparator(isDark).withOpacity(0.5),
                  width: 0.5,
                ),
              ),
              child: CupertinoButton(
                padding: const EdgeInsets.all(16),
                onPressed: () {
                  HapticFeedback.mediumImpact();
                  Navigator.of(context).pop();
                  onUseTemplate(template);
                },
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: AppColors.getSecondaryBackground(isDark),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        template.icon,
                        style: const TextStyle(fontSize: 24),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                template.title,
                                style: TextStyle(
                                  fontSize: 17,
                                  fontWeight: FontWeight.w600,
                                  color: label,
                                  letterSpacing: -0.3,
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                decoration: BoxDecoration(
                                  color: AppColors.blueLight.withOpacity(0.12),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  template.category,
                                  style: const TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                    color: AppColors.blueLight,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Text(
                            template.description,
                            style: TextStyle(
                              fontSize: 13,
                              color: secondaryLabel,
                              height: 1.3,
                            ),
                          ),
                          const SizedBox(height: 10),
                          Wrap(
                            spacing: 6,
                            children: template.tags.map((t) {
                              return Text(
                                '#$t',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w500,
                                  color: secondaryLabel,
                                ),
                              );
                            }).toList(),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
