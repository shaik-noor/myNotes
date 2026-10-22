import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import '../../constants/app_colors.dart';
import '../../models/note.dart';

class NoteListItem extends StatelessWidget {
  final Note note;
  final int subpagesCount;
  final VoidCallback onTap;
  final VoidCallback onTogglePin;
  final VoidCallback onDelete;

  const NoteListItem({
    super.key,
    required this.note,
    this.subpagesCount = 0,
    required this.onTap,
    required this.onTogglePin,
    required this.onDelete,
  });

  String _formatDate(String isoString) {
    try {
      final date = DateTime.parse(isoString).toLocal();
      final now = DateTime.now();
      final difference = now.difference(date);

      if (difference.inDays == 0 && date.day == now.day) {
        return DateFormat.jm().format(date);
      } else if (difference.inDays < 7) {
        return DateFormat('EEEE').format(date);
      } else {
        return DateFormat('M/d/yy').format(date);
      }
    } catch (_) {
      return '';
    }
  }

  String _cleanSnippet(String markdown) {
    return markdown
        .replaceAll(RegExp(r'#+\s*'), '')
        .replaceAll(RegExp(r'\*\*|__|~~|`'), '')
        .replaceAll(RegExp(r'\[([^\]]+)\]\([^\)]+\)'), r'$1')
        .replaceAll(RegExp(r'-\s*\[[ x]\]\s*'), '')
        .replaceAll(RegExp(r'\n+'), ' ')
        .trim();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = CupertinoTheme.of(context).brightness == Brightness.dark;
    final snippet = _cleanSnippet(note.content);
    final dateStr = _formatDate(note.updatedAt);

    return Dismissible(
      key: ValueKey(note.id),
      direction: DismissDirection.horizontal,
      confirmDismiss: (direction) async {
        if (direction == DismissDirection.startToEnd) {
          // Toggle Pin
          HapticFeedback.mediumImpact();
          onTogglePin();
          return false; // Don't dismiss from tree
        } else {
          // Delete
          HapticFeedback.heavyImpact();
          return await showCupertinoDialog<bool>(
            context: context,
            builder: (ctx) => CupertinoAlertDialog(
              title: const Text('Delete Note?'),
              content: Text(
                'Are you sure you want to delete "${note.title.isNotEmpty ? note.title : 'Untitled'}"? This cannot be undone.',
              ),
              actions: [
                CupertinoDialogAction(
                  isDefaultAction: true,
                  child: const Text('Cancel'),
                  onPressed: () => Navigator.of(ctx).pop(false),
                ),
                CupertinoDialogAction(
                  isDestructiveAction: true,
                  child: const Text('Delete'),
                  onPressed: () {
                    onDelete();
                    Navigator.of(ctx).pop(true);
                  },
                ),
              ],
            ),
          ) ?? false;
        }
      },
      background: Container(
        color: CupertinoColors.systemOrange,
        alignment: Alignment.centerLeft,
        padding: const EdgeInsets.only(left: 20),
        child: Icon(
          note.isPinned ? CupertinoIcons.pin_slash_fill : CupertinoIcons.pin_fill,
          color: CupertinoColors.white,
          size: 24,
        ),
      ),
      secondaryBackground: Container(
        color: CupertinoColors.systemRed,
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        child: const Icon(
          CupertinoIcons.trash_fill,
          color: CupertinoColors.white,
          size: 24,
        ),
      ),
      child: Container(
        color: AppColors.getCardBackground(isDark),
        child: CupertinoButton(
          padding: EdgeInsets.zero,
          onPressed: () {
            HapticFeedback.selectionClick();
            onTap();
          },
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              border: Border(
                bottom: BorderSide(
                  color: AppColors.getSeparator(isDark).withOpacity(0.5),
                  width: 0.5,
                ),
              ),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Note Icon / Emoji
                Container(
                  width: 36,
                  height: 36,
                  margin: const EdgeInsets.only(top: 2, right: 12),
                  decoration: BoxDecoration(
                    color: AppColors.getSecondaryBackground(isDark),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    note.icon != null && note.icon!.isNotEmpty ? note.icon! : '📝',
                    style: const TextStyle(fontSize: 20),
                  ),
                ),

                // Note Details
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Title row with Pin indicator
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              note.title.isNotEmpty ? note.title : 'Untitled',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                                color: AppColors.getLabel(isDark),
                                letterSpacing: -0.3,
                              ),
                            ),
                          ),
                          if (note.isPinned) ...[
                            const SizedBox(width: 6),
                            const Icon(
                              CupertinoIcons.pin_fill,
                              size: 13,
                              color: CupertinoColors.systemOrange,
                            ),
                          ],
                          if (subpagesCount > 0) ...[
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                              decoration: BoxDecoration(
                                color: AppColors.getSecondaryBackground(isDark),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Text(
                                '$subpagesCount sub',
                                style: TextStyle(
                                  fontSize: 10,
                                  color: AppColors.getSecondaryLabel(isDark),
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),

                      const SizedBox(height: 3),

                      // Date & Snippet preview
                      Row(
                        children: [
                          Text(
                            dateStr,
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                              color: AppColors.getLabel(isDark).withOpacity(0.85),
                            ),
                          ),
                          if (snippet.isNotEmpty) ...[
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                snippet,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  fontSize: 13,
                                  color: AppColors.getSecondaryLabel(isDark),
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),

                      // Tags Row if any
                      if (note.tagList.isNotEmpty) ...[
                        const SizedBox(height: 6),
                        Wrap(
                          spacing: 4,
                          runSpacing: 4,
                          children: note.tagList.take(3).map((tag) {
                            return Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: AppColors.blueLight.withOpacity(0.09),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                '#$tag',
                                style: const TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w500,
                                  color: AppColors.blueLight,
                                ),
                              ),
                            );
                          }).toList(),
                        ),
                      ],
                    ],
                  ),
                ),

                const SizedBox(width: 8),
                Icon(
                  CupertinoIcons.chevron_right,
                  size: 14,
                  color: AppColors.getSecondaryLabel(isDark).withOpacity(0.5),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
