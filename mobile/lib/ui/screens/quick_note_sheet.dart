import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../constants/app_colors.dart';
import '../../providers/notes_provider.dart';

class QuickNoteSheet extends StatefulWidget {
  const QuickNoteSheet({super.key});

  static Future<void> show(BuildContext context) {
    return showCupertinoModalPopup<void>(
      context: context,
      builder: (_) => const QuickNoteSheet(),
    );
  }

  @override
  State<QuickNoteSheet> createState() => _QuickNoteSheetState();
}

class _QuickNoteSheetState extends State<QuickNoteSheet> {
  final TextEditingController _textController = TextEditingController();

  void _saveQuickNote() async {
    final text = _textController.text.trim();
    if (text.isEmpty) {
      Navigator.of(context).pop();
      return;
    }

    HapticFeedback.mediumImpact();
    final firstLine = text.split('\n').first.trim();
    final title = firstLine.length > 30 ? '${firstLine.substring(0, 30)}...' : firstLine;

    await context.read<NotesProvider>().createNote(
          title: title,
          content: text,
          icon: '⚡',
        );

    if (!mounted) return;
    Navigator.of(context).pop();
  }

  @override
  void dispose() {
    _textController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = CupertinoTheme.of(context).brightness == Brightness.dark;
    final bg = AppColors.getCardBackground(isDark);
    final label = AppColors.getLabel(isDark);

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
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                CupertinoButton(
                  padding: EdgeInsets.zero,
                  child: const Text('Cancel'),
                  onPressed: () => Navigator.of(context).pop(),
                ),
                Text(
                  'Quick Scratchpad',
                  style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w700,
                    color: label,
                  ),
                ),
                CupertinoButton(
                  padding: EdgeInsets.zero,
                  onPressed: _saveQuickNote,
                  child: const Text('Save', style: TextStyle(fontWeight: FontWeight.w700)),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Expanded(
              child: CupertinoTextField(
                controller: _textController,
                autofocus: true,
                placeholder: 'Jot down an idea, task, or thought quickly...',
                style: TextStyle(fontSize: 16, color: label, height: 1.4),
                maxLines: null,
                decoration: null,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
