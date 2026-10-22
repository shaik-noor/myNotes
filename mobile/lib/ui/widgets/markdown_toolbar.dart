import 'dart:ui';
import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import '../../constants/app_colors.dart';

class MarkdownToolbar extends StatelessWidget {
  final TextEditingController controller;
  final FocusNode focusNode;
  final VoidCallback? onInsertTable;
  final VoidCallback? onInsertLink;
  final VoidCallback? onInsertAttachment;
  final VoidCallback? onMentionPage;

  const MarkdownToolbar({
    super.key,
    required this.controller,
    required this.focusNode,
    this.onInsertTable,
    this.onInsertLink,
    this.onInsertAttachment,
    this.onMentionPage,
  });

  void _wrapSelection(String prefix, String suffix, {String defaultText = ''}) {
    HapticFeedback.lightImpact();
    final text = controller.text;
    final selection = controller.selection;

    if (!selection.isValid || selection.isCollapsed) {
      final insert = '$prefix$defaultText$suffix';
      final newText = text.replaceRange(selection.start, selection.end, insert);
      controller.value = TextEditingValue(
        text: newText,
        selection: TextSelection.collapsed(offset: selection.start + prefix.length + defaultText.length),
      );
    } else {
      final selectedText = text.substring(selection.start, selection.end);
      final insert = '$prefix$selectedText$suffix';
      final newText = text.replaceRange(selection.start, selection.end, insert);
      controller.value = TextEditingValue(
        text: newText,
        selection: TextSelection(
          baseOffset: selection.start + prefix.length,
          extentOffset: selection.start + prefix.length + selectedText.length,
        ),
      );
    }
  }

  void _insertLinePrefix(String prefix) {
    HapticFeedback.lightImpact();
    final text = controller.text;
    final selection = controller.selection;

    // Find the start of current line
    var lineStart = selection.start;
    while (lineStart > 0 && text[lineStart - 1] != '\n') {
      lineStart--;
    }

    final newText = text.replaceRange(lineStart, lineStart, prefix);
    controller.value = TextEditingValue(
      text: newText,
      selection: TextSelection.collapsed(offset: selection.start + prefix.length),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = CupertinoTheme.of(context).brightness == Brightness.dark;
    final bg = isDark ? const Color(0xE6141418) : const Color(0xE6F2F2F7);
    final iconColor = AppColors.getLabel(isDark);

    return ClipRect(
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
        child: Container(
          height: 44,
          decoration: BoxDecoration(
            color: bg,
            border: Border(
              top: BorderSide(
                color: AppColors.getSeparator(isDark).withOpacity(0.4),
                width: 0.5,
              ),
            ),
          ),
          child: Row(
            children: [
              Expanded(
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  children: [
                    // Task Checklist
                    _ToolbarButton(
                      icon: CupertinoIcons.checkmark_square,
                      label: 'Task',
                      color: iconColor,
                      onPressed: () => _insertLinePrefix('- [ ] '),
                    ),

                    // Headings
                    _ToolbarButton(
                      textLabel: 'H1',
                      color: iconColor,
                      onPressed: () => _insertLinePrefix('# '),
                    ),
                    _ToolbarButton(
                      textLabel: 'H2',
                      color: iconColor,
                      onPressed: () => _insertLinePrefix('## '),
                    ),
                    _ToolbarButton(
                      textLabel: 'H3',
                      color: iconColor,
                      onPressed: () => _insertLinePrefix('### '),
                    ),

                    // Bold
                    _ToolbarButton(
                      icon: CupertinoIcons.bold,
                      label: 'Bold',
                      color: iconColor,
                      onPressed: () => _wrapSelection('**', '**', defaultText: 'bold text'),
                    ),

                    // Italic
                    _ToolbarButton(
                      icon: CupertinoIcons.italic,
                      label: 'Italic',
                      color: iconColor,
                      onPressed: () => _wrapSelection('*', '*', defaultText: 'italic text'),
                    ),

                    // Strikethrough
                    _ToolbarButton(
                      icon: CupertinoIcons.strikethrough,
                      label: 'Strike',
                      color: iconColor,
                      onPressed: () => _wrapSelection('~~', '~~', defaultText: 'strikethrough'),
                    ),

                    // Inline Code
                    _ToolbarButton(
                      textLabel: '</>',
                      color: iconColor,
                      onPressed: () => _wrapSelection('`', '`', defaultText: 'code'),
                    ),

                    // Bullet List
                    _ToolbarButton(
                      icon: CupertinoIcons.list_bullet,
                      label: 'Bullet',
                      color: iconColor,
                      onPressed: () => _insertLinePrefix('- '),
                    ),

                    // Numbered List
                    _ToolbarButton(
                      icon: CupertinoIcons.list_number,
                      label: 'Number',
                      color: iconColor,
                      onPressed: () => _insertLinePrefix('1. '),
                    ),

                    // Blockquote
                    _ToolbarButton(
                      icon: CupertinoIcons.quote_bubble,
                      label: 'Quote',
                      color: iconColor,
                      onPressed: () => _insertLinePrefix('> '),
                    ),

                    // Horizontal Rule
                    _ToolbarButton(
                      icon: CupertinoIcons.minus,
                      label: 'Divider',
                      color: iconColor,
                      onPressed: () {
                        HapticFeedback.lightImpact();
                        final pos = controller.selection.start;
                        final text = controller.text;
                        final newText = text.replaceRange(pos, pos, '\n---\n\n');
                        controller.value = TextEditingValue(
                          text: newText,
                          selection: TextSelection.collapsed(offset: pos + 6),
                        );
                      },
                    ),

                    // Mention Page [[...]]
                    _ToolbarButton(
                      textLabel: '[[ ]]',
                      color: iconColor,
                      onPressed: () => _wrapSelection('[[', ']]', defaultText: 'Page Name'),
                    ),

                    // Link
                    _ToolbarButton(
                      icon: CupertinoIcons.link,
                      label: 'Link',
                      color: iconColor,
                      onPressed: () => _wrapSelection('[', '](https://)', defaultText: 'link title'),
                    ),

                    // Code Block
                    _ToolbarButton(
                      icon: CupertinoIcons.chevron_left_slash_chevron_right,
                      label: 'Code Block',
                      color: iconColor,
                      onPressed: () {
                        HapticFeedback.lightImpact();
                        final pos = controller.selection.start;
                        final text = controller.text;
                        final newText = text.replaceRange(pos, pos, '\n```\n\n```\n');
                        controller.value = TextEditingValue(
                          text: newText,
                          selection: TextSelection.collapsed(offset: pos + 5),
                        );
                      },
                    ),
                  ],
                ),
              ),

              // Hide Keyboard button
              Container(
                decoration: BoxDecoration(
                  border: Border(
                    left: BorderSide(
                      color: AppColors.getSeparator(isDark).withOpacity(0.3),
                      width: 0.5,
                    ),
                  ),
                ),
                child: CupertinoButton(
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                  onPressed: () {
                    HapticFeedback.lightImpact();
                    focusNode.unfocus();
                  },
                  child: Icon(
                    CupertinoIcons.keyboard_chevron_compact_down,
                    size: 20,
                    color: AppColors.getSecondaryLabel(isDark),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ToolbarButton extends StatelessWidget {
  final IconData? icon;
  final String? textLabel;
  final String? label;
  final Color color;
  final VoidCallback onPressed;

  const _ToolbarButton({
    this.icon,
    this.textLabel,
    this.label,
    required this.color,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return CupertinoButton(
      padding: const EdgeInsets.symmetric(horizontal: 10),
      onPressed: onPressed,
      child: Center(
        child: icon != null
            ? Icon(icon, size: 18, color: color)
            : Text(
                textLabel ?? '',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: color,
                ),
              ),
      ),
    );
  }
}
