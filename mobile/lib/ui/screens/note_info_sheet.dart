import 'package:flutter/cupertino.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../constants/app_colors.dart';
import '../../models/note.dart';
import '../../providers/notes_provider.dart';

class NoteInfoSheet extends StatefulWidget {
  final Note note;

  const NoteInfoSheet({super.key, required this.note});

  static Future<void> show(BuildContext context, {required Note note}) {
    return showCupertinoModalPopup<void>(
      context: context,
      builder: (_) => NoteInfoSheet(note: note),
    );
  }

  @override
  State<NoteInfoSheet> createState() => _NoteInfoSheetState();
}

class _NoteInfoSheetState extends State<NoteInfoSheet> {
  final TextEditingController _tagInputController = TextEditingController();

  int get wordCount {
    final text = widget.note.content.trim();
    if (text.isEmpty) return 0;
    return text.split(RegExp(r'\s+')).length;
  }

  int get charCount => widget.note.content.length;

  int get readTimeMinutes {
    final words = wordCount;
    return (words / 200).ceil().clamp(1, 999);
  }

  String _formatDate(String isoString) {
    try {
      final date = DateTime.parse(isoString).toLocal();
      return DateFormat('MMM d, yyyy · h:mm a').format(date);
    } catch (_) {
      return isoString;
    }
  }

  void _addTag(String tag) {
    final clean = tag.trim().toLowerCase().replaceAll(RegExp(r'[^\w\d-]'), '');
    if (clean.isEmpty) return;

    final currentTags = List<String>.from(widget.note.tagList);
    if (!currentTags.contains(clean)) {
      currentTags.add(clean);
      context.read<NotesProvider>().updateNote(
            widget.note.copyWith(tags: currentTags),
          );
    }
    _tagInputController.clear();
  }

  void _removeTag(String tag) {
    final currentTags = List<String>.from(widget.note.tagList);
    currentTags.remove(tag);
    context.read<NotesProvider>().updateNote(
          widget.note.copyWith(tags: currentTags),
        );
  }

  @override
  void dispose() {
    _tagInputController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = CupertinoTheme.of(context).brightness == Brightness.dark;
    final bg = AppColors.getCardBackground(isDark);
    final label = AppColors.getLabel(isDark);
    final secondaryLabel = AppColors.getSecondaryLabel(isDark);
    final notesProvider = context.watch<NotesProvider>();
    final currentNote = notesProvider.getNoteById(widget.note.id) ?? widget.note;

    return Container(
      height: 480,
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
                  'Note Details',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: label,
                    letterSpacing: -0.4,
                  ),
                ),
                CupertinoButton(
                  padding: EdgeInsets.zero,
                  child: const Text('Done'),
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Metrics Grid
            Row(
              children: [
                _StatCard(label: 'Words', value: '$wordCount', isDark: isDark),
                const SizedBox(width: 10),
                _StatCard(label: 'Characters', value: '$charCount', isDark: isDark),
                const SizedBox(width: 10),
                _StatCard(label: 'Read Time', value: '${readTimeMinutes}m', isDark: isDark),
              ],
            ),

            const SizedBox(height: 20),

            // Metadata rows
            _InfoRow(title: 'Created', value: _formatDate(currentNote.createdAt), isDark: isDark),
            const SizedBox(height: 10),
            _InfoRow(title: 'Modified', value: _formatDate(currentNote.updatedAt), isDark: isDark),

            const SizedBox(height: 20),

            // Tags section
            Text(
              'Tags',
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w600,
                color: label,
              ),
            ),
            const SizedBox(height: 8),

            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                for (final tag in currentNote.tagList)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.blueLight.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          '#$tag',
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: AppColors.blueLight,
                          ),
                        ),
                        const SizedBox(width: 4),
                        GestureDetector(
                          onTap: () => _removeTag(tag),
                          child: const Icon(
                            CupertinoIcons.xmark_circle_fill,
                            size: 14,
                            color: AppColors.blueLight,
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),

            const SizedBox(height: 10),

            // Add Tag Field
            Row(
              children: [
                Expanded(
                  child: CupertinoTextField(
                    controller: _tagInputController,
                    placeholder: 'Add new tag...',
                    style: TextStyle(color: label, fontSize: 14),
                    onSubmitted: _addTag,
                  ),
                ),
                const SizedBox(width: 8),
                CupertinoButton(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  child: const Text('Add'),
                  onPressed: () => _addTag(_tagInputController.text),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label;
  final String value;
  final bool isDark;

  const _StatCard({required this.label, required this.value, required this.isDark});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: AppColors.getSecondaryBackground(isDark),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          children: [
            Text(
              value,
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: AppColors.getLabel(isDark),
              ),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                color: AppColors.getSecondaryLabel(isDark),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String title;
  final String value;
  final bool isDark;

  const _InfoRow({required this.title, required this.value, required this.isDark});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(title, style: TextStyle(fontSize: 14, color: AppColors.getSecondaryLabel(isDark))),
        Text(value, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: AppColors.getLabel(isDark))),
      ],
    );
  }
}
