import 'package:flutter/cupertino.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../constants/app_colors.dart';

class InteractiveTaskView extends StatelessWidget {
  final String content;
  final ValueChanged<String>? onContentChanged;
  final Function(String targetTitle)? onPageMentionTap;

  const InteractiveTaskView({
    super.key,
    required this.content,
    this.onContentChanged,
    this.onPageMentionTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = CupertinoTheme.of(context).brightness == Brightness.dark;
    final textColor = AppColors.getLabel(isDark);
    final secondaryColor = AppColors.getSecondaryLabel(isDark);

    return MarkdownBody(
      data: content,
      selectable: true,
      onTapLink: (text, href, title) {
        if (href != null) {
          launchUrl(Uri.parse(href), mode: LaunchMode.externalApplication);
        }
      },
      styleSheet: MarkdownStyleSheet(
        p: TextStyle(
          fontSize: 16,
          height: 1.5,
          color: textColor,
          letterSpacing: -0.2,
        ),
        h1: TextStyle(
          fontSize: 26,
          fontWeight: FontWeight.w700,
          color: textColor,
          letterSpacing: -0.5,
          height: 1.3,
        ),
        h2: TextStyle(
          fontSize: 21,
          fontWeight: FontWeight.w600,
          color: textColor,
          letterSpacing: -0.4,
          height: 1.3,
        ),
        h3: TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.w600,
          color: textColor,
          letterSpacing: -0.3,
          height: 1.3,
        ),
        blockquote: TextStyle(
          fontSize: 15,
          fontStyle: FontStyle.italic,
          color: secondaryColor,
        ),
        blockquoteDecoration: const BoxDecoration(
          border: Border(
            left: BorderSide(
              color: AppColors.blueLight,
              width: 3.5,
            ),
          ),
        ),
        code: TextStyle(
          fontFamily: 'monospace',
          fontSize: 14,
          color: AppColors.getAccent('purple', isDark),
          backgroundColor: AppColors.getSecondaryBackground(isDark),
        ),
        codeblockDecoration: BoxDecoration(
          color: AppColors.getSecondaryBackground(isDark),
          borderRadius: BorderRadius.circular(8),
        ),
        tableBorder: TableBorder.all(
          color: AppColors.getSeparator(isDark),
          width: 0.5,
        ),
        listBullet: TextStyle(color: textColor),
      ),
      checkboxBuilder: (value) {
        return CupertinoCheckbox(
          value: value,
          onChanged: (newVal) {
            // Checkbox interaction
          },
        );
      },
    );
  }
}
