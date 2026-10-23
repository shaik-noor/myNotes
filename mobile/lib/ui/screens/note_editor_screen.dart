import 'dart:async';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';
import '../../constants/app_colors.dart';
import '../../constants/banner_presets.dart';
import '../../models/note.dart';
import '../../providers/notes_provider.dart';
import '../../providers/settings_provider.dart';
import '../widgets/markdown_toolbar.dart';
import '../widgets/cover_banner_picker.dart';
import '../widgets/emoji_picker_sheet.dart';
import '../widgets/interactive_task_view.dart';
import 'note_info_sheet.dart';

class NoteEditorScreen extends StatefulWidget {
  final String noteId;

  const NoteEditorScreen({super.key, required this.noteId});

  @override
  State<NoteEditorScreen> createState() => _NoteEditorScreenState();
}

class _NoteEditorScreenState extends State<NoteEditorScreen> {
  late TextEditingController _titleController;
  late TextEditingController _contentController;
  late FocusNode _contentFocusNode;

  Timer? _saveDebounceTimer;
  int _viewMode = 0; // 0: Edit, 1: Preview

  @override
  void initState() {
    super.initState();
    final note = context.read<NotesProvider>().getNoteById(widget.noteId);
    _titleController = TextEditingController(text: note?.title ?? '');
    _contentController = TextEditingController(text: note?.content ?? '');
    _contentFocusNode = FocusNode();

    _titleController.addListener(_onTextChanged);
    _contentController.addListener(_onTextChanged);
  }

  void _onTextChanged() {
    _saveDebounceTimer?.cancel();
    _saveDebounceTimer = Timer(const Duration(milliseconds: 600), () {
      _saveCurrentState();
    });
  }

  void _saveCurrentState() {
    final notesProvider = context.read<NotesProvider>();
    final note = notesProvider.getNoteById(widget.noteId);
    if (note == null) return;

    final newTitle = _titleController.text.trim();
    final newContent = _contentController.text;

    if (note.title != newTitle || note.content != newContent) {
      notesProvider.updateNote(
        note.copyWith(
          title: newTitle.isEmpty ? 'Untitled' : newTitle,
          content: newContent,
        ),
      );
    }
  }

  @override
  void dispose() {
    _saveDebounceTimer?.cancel();
    _saveCurrentState();
    _titleController.dispose();
    _contentController.dispose();
    _contentFocusNode.dispose();
    super.dispose();
  }

  void _showActionSheet(BuildContext context, Note note) {
    HapticFeedback.lightImpact();
    final notesProvider = context.read<NotesProvider>();

    showCupertinoModalPopup<void>(
      context: context,
      builder: (ctx) => CupertinoActionSheet(
        title: Text(note.title.isNotEmpty ? note.title : 'Untitled'),
        actions: [
          // Document Info
          CupertinoActionSheetAction(
            child: const Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(CupertinoIcons.info_circle, size: 20),
                SizedBox(width: 8),
                Text('Document Info & Stats'),
              ],
            ),
            onPressed: () {
              Navigator.of(ctx).pop();
              NoteInfoSheet.show(context, note: note);
            },
          ),

          // Toggle Pin
          CupertinoActionSheetAction(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  note.isPinned ? CupertinoIcons.pin_slash : CupertinoIcons.pin,
                  size: 20,
                ),
                const SizedBox(width: 8),
                Text(note.isPinned ? 'Unpin Note' : 'Pin to Top'),
              ],
            ),
            onPressed: () {
              notesProvider.togglePin(note.id);
              Navigator.of(ctx).pop();
            },
          ),

          // Share / Export Markdown
          CupertinoActionSheetAction(
            child: const Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(CupertinoIcons.share, size: 20),
                SizedBox(width: 8),
                Text('Share / Export as Markdown'),
              ],
            ),
            onPressed: () {
              Navigator.of(ctx).pop();
              final exportText = '# ${note.title}\n\n${note.content}';
              Share.share(exportText, subject: note.title);
            },
          ),

          // Add Subpage
          CupertinoActionSheetAction(
            child: const Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(CupertinoIcons.add_circled, size: 20),
                SizedBox(width: 8),
                Text('Add Subpage'),
              ],
            ),
            onPressed: () async {
              Navigator.of(ctx).pop();
              final child = await notesProvider.createChildPage(note.id);
              if (!mounted) return;
              Navigator.of(context).push(
                CupertinoPageRoute(builder: (_) => NoteEditorScreen(noteId: child.id)),
              );
            },
          ),

          // Delete Note / Notebook
          CupertinoActionSheetAction(
            isDestructiveAction: true,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(CupertinoIcons.delete, size: 20, color: CupertinoColors.destructiveRed),
                const SizedBox(width: 8),
                Text(notesProvider.getSubpages(note.id).isNotEmpty ? 'Delete Notebook' : 'Delete Note'),
              ],
            ),
            onPressed: () async {
              Navigator.of(ctx).pop();
              final subpages = notesProvider.getSubpages(note.id);
              final isNotebook = subpages.isNotEmpty;
              final ok = await showCupertinoDialog<bool>(
                context: context,
                builder: (dialogCtx) => CupertinoAlertDialog(
                  title: Text(isNotebook ? 'Delete Notebook?' : 'Delete Note?'),
                  content: Text(
                    isNotebook
                        ? 'Are you sure you want to delete "${note.title.isNotEmpty ? note.title : 'Untitled'}" and its ${subpages.length} subpage(s)? This cannot be undone.'
                        : 'Are you sure you want to delete "${note.title.isNotEmpty ? note.title : 'Untitled'}"? This cannot be undone.',
                  ),
                  actions: [
                    CupertinoDialogAction(
                      isDefaultAction: true,
                      child: const Text('Cancel'),
                      onPressed: () => Navigator.of(dialogCtx).pop(false),
                    ),
                    CupertinoDialogAction(
                      isDestructiveAction: true,
                      child: const Text('Delete'),
                      onPressed: () => Navigator.of(dialogCtx).pop(true),
                    ),
                  ],
                ),
              ) ?? false;

              if (ok && mounted) {
                await notesProvider.deleteNote(note.id);
                if (mounted) {
                  Navigator.of(context).pop();
                }
              }
            },
          ),
        ],
        cancelButton: CupertinoActionSheetAction(
          isDefaultAction: true,
          child: const Text('Cancel'),
          onPressed: () => Navigator.of(ctx).pop(),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final notesProvider = context.watch<NotesProvider>();
    final settingsProvider = context.watch<SettingsProvider>();
    final isDark = settingsProvider.isDarkMode(context);

    final note = notesProvider.getNoteById(widget.noteId);
    if (note == null) {
      return CupertinoPageScaffold(
        navigationBar: const CupertinoNavigationBar(middle: Text('Note not found')),
        child: Center(
          child: CupertinoButton(
            child: const Text('Back to Notes'),
            onPressed: () => Navigator.of(context).pop(),
          ),
        ),
      );
    }

    final accentColor = AppColors.getAccent(settingsProvider.palette, isDark);
    final bgColor = AppColors.getBackground(isDark);
    final ancestors = notesProvider.getAncestors(note.id);
    final subpages = notesProvider.getSubpages(note.id);
    final backlinks = notesProvider.getBacklinks(note.id);
    final coverPreset = BannerPresets.findPreset(note.coverImage);

    return CupertinoPageScaffold(
      backgroundColor: bgColor,
      navigationBar: CupertinoNavigationBar(
        backgroundColor: bgColor.withOpacity(0.88),
        leading: CupertinoButton(
          padding: EdgeInsets.zero,
          onPressed: () {
            _saveCurrentState();
            Navigator.of(context).pop();
          },
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(CupertinoIcons.chevron_back, size: 24, color: accentColor),
              Text(
                'Notes',
                style: TextStyle(
                  color: accentColor,
                  fontSize: 17,
                  letterSpacing: -0.4,
                ),
              ),
            ],
          ),
        ),
        middle: SizedBox(
          width: 140,
          child: CupertinoSlidingSegmentedControl<int>(
            groupValue: _viewMode,
            children: const {
              0: Padding(
                padding: EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                child: Text('Edit', style: TextStyle(fontSize: 12)),
              ),
              1: Padding(
                padding: EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                child: Text('View', style: TextStyle(fontSize: 12)),
              ),
            },
            onValueChanged: (v) {
              if (v != null) {
                HapticFeedback.selectionClick();
                setState(() => _viewMode = v);
              }
            },
          ),
        ),
        trailing: CupertinoButton(
          padding: EdgeInsets.zero,
          onPressed: () => _showActionSheet(context, note),
          child: Icon(
            CupertinoIcons.ellipsis_circle,
            size: 22,
            color: accentColor,
          ),
        ),
      ),
      child: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: ListView(
                padding: EdgeInsets.zero,
                children: [
                  // 1. Cover Banner if set
                  if (coverPreset != null)
                    Stack(
                      children: [
                        Container(
                          height: 140,
                          width: double.infinity,
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              colors: coverPreset.colors,
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                            ),
                          ),
                        ),
                        Positioned(
                          right: 12,
                          bottom: 12,
                          child: CupertinoButton(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            color: Colors.black45,
                            borderRadius: BorderRadius.circular(14),
                            onPressed: () => CoverBannerPicker.show(
                              context,
                              currentCover: note.coverImage,
                              onSelectCover: (c) => notesProvider.updateNote(note.copyWith(coverImage: c)),
                            ),
                            child: const Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(CupertinoIcons.photo, size: 14, color: CupertinoColors.white),
                                SizedBox(width: 5),
                                Text(
                                  'Change Cover',
                                  style: TextStyle(fontSize: 11, color: CupertinoColors.white),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),

                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // 2. Breadcrumbs if subpage
                        if (ancestors.isNotEmpty) ...[
                          Wrap(
                            crossAxisAlignment: WrapCrossAlignment.center,
                            children: [
                              for (var i = 0; i < ancestors.length; i++) ...[
                                GestureDetector(
                                  onTap: () {
                                    Navigator.of(context).pushReplacement(
                                      CupertinoPageRoute(
                                        builder: (_) => NoteEditorScreen(noteId: ancestors[i].id),
                                      ),
                                    );
                                  },
                                  child: Text(
                                    '${ancestors[i].icon ?? '📄'} ${ancestors[i].title}',
                                    style: TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w500,
                                      color: accentColor,
                                    ),
                                  ),
                                ),
                                const Padding(
                                  padding: EdgeInsets.symmetric(horizontal: 4),
                                  child: Icon(
                                    CupertinoIcons.chevron_forward,
                                    size: 11,
                                    color: CupertinoColors.systemGrey,
                                  ),
                                ),
                              ],
                            ],
                          ),
                          const SizedBox(height: 10),
                        ],

                        // 3. Icon & Cover Action Row
                        Row(
                          children: [
                            // Emoji Icon button
                            GestureDetector(
                              onTap: () => EmojiPickerSheet.show(
                                context,
                                currentEmoji: note.icon,
                                onSelectEmoji: (e) => notesProvider.updateNote(note.copyWith(icon: e)),
                              ),
                              child: Container(
                                width: 48,
                                height: 48,
                                decoration: BoxDecoration(
                                  color: AppColors.getSecondaryBackground(isDark),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                alignment: Alignment.center,
                                child: Text(
                                  note.icon != null && note.icon!.isNotEmpty ? note.icon! : '📝',
                                  style: const TextStyle(fontSize: 28),
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),

                            // Add Cover button if no cover
                            if (coverPreset == null)
                              CupertinoButton(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                onPressed: () => CoverBannerPicker.show(
                                  context,
                                  currentCover: note.coverImage,
                                  onSelectCover: (c) => notesProvider.updateNote(note.copyWith(coverImage: c)),
                                ),
                                child: Row(
                                  children: [
                                    Icon(CupertinoIcons.photo, size: 16, color: accentColor),
                                    const SizedBox(width: 4),
                                    Text(
                                      'Add Cover',
                                      style: TextStyle(fontSize: 13, color: accentColor),
                                    ),
                                  ],
                                ),
                              ),

                            const Spacer(),

                            // Add Subpage quick button
                            CupertinoButton(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                              onPressed: () async {
                                final child = await notesProvider.createChildPage(note.id);
                                if (!mounted) return;
                                Navigator.of(context).push(
                                  CupertinoPageRoute(builder: (_) => NoteEditorScreen(noteId: child.id)),
                                );
                              },
                              child: Row(
                                children: [
                                  Icon(CupertinoIcons.plus_square_on_square, size: 16, color: accentColor),
                                  const SizedBox(width: 4),
                                  Text(
                                    'Subpage',
                                    style: TextStyle(fontSize: 13, color: accentColor),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),

                        const SizedBox(height: 16),

                        // 4. Large Title Input
                        CupertinoTextField(
                          controller: _titleController,
                          placeholder: 'Title',
                          style: TextStyle(
                            fontSize: 28,
                            fontWeight: FontWeight.w700,
                            letterSpacing: -0.6,
                            color: AppColors.getLabel(isDark),
                          ),
                          decoration: null,
                          padding: EdgeInsets.zero,
                          maxLines: null,
                          textInputAction: TextInputAction.next,
                          onSubmitted: (_) => _contentFocusNode.requestFocus(),
                        ),

                        const SizedBox(height: 16),

                        // 5. Body: Editor vs Preview
                        if (_viewMode == 0)
                          CupertinoTextField(
                            controller: _contentController,
                            focusNode: _contentFocusNode,
                            placeholder: 'Start writing markdown, checklists, notes...',
                            style: TextStyle(
                              fontSize: 17,
                              height: 1.5,
                              color: AppColors.getLabel(isDark),
                              letterSpacing: -0.2,
                            ),
                            decoration: null,
                            padding: EdgeInsets.zero,
                            maxLines: null,
                            keyboardType: TextInputType.multiline,
                          )
                        else
                          InteractiveTaskView(
                            content: _contentController.text,
                            onContentChanged: (newContent) {
                              _contentController.text = newContent;
                              _saveCurrentState();
                            },
                          ),

                        // 6. Subpages Section if any
                        if (subpages.isNotEmpty) ...[
                          const SizedBox(height: 36),
                          const Divider(),
                          const SizedBox(height: 12),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'Subpages (${subpages.length})',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.getLabel(isDark),
                                ),
                              ),
                              CupertinoButton(
                                padding: EdgeInsets.zero,
                                onPressed: () async {
                                  final child = await notesProvider.createChildPage(note.id);
                                  if (!mounted) return;
                                  Navigator.of(context).push(
                                    CupertinoPageRoute(builder: (_) => NoteEditorScreen(noteId: child.id)),
                                  );
                                },
                                child: Text('+ Add Subpage', style: TextStyle(color: accentColor)),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          for (final sub in subpages)
                            CupertinoButton(
                              padding: const EdgeInsets.symmetric(vertical: 6),
                              onPressed: () {
                                Navigator.of(context).push(
                                  CupertinoPageRoute(builder: (_) => NoteEditorScreen(noteId: sub.id)),
                                );
                              },
                              child: Row(
                                children: [
                                  Text(sub.icon ?? '📄', style: const TextStyle(fontSize: 18)),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      sub.title.isNotEmpty ? sub.title : 'Untitled',
                                      style: TextStyle(
                                        fontSize: 15,
                                        fontWeight: FontWeight.w500,
                                        color: AppColors.getLabel(isDark),
                                      ),
                                    ),
                                  ),
                                  const Icon(CupertinoIcons.chevron_forward, size: 14),
                                ],
                              ),
                            ),
                        ],

                        // 7. Backlinks Section if any
                        if (backlinks.isNotEmpty) ...[
                          const SizedBox(height: 32),
                          const Divider(),
                          const SizedBox(height: 12),
                          Text(
                            'Linked Pages (${backlinks.length})',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                              color: AppColors.getLabel(isDark),
                            ),
                          ),
                          const SizedBox(height: 8),
                          for (final link in backlinks)
                            CupertinoButton(
                              padding: const EdgeInsets.symmetric(vertical: 6),
                              onPressed: () {
                                Navigator.of(context).push(
                                  CupertinoPageRoute(builder: (_) => NoteEditorScreen(noteId: link.id)),
                                );
                              },
                              child: Row(
                                children: [
                                  const Icon(CupertinoIcons.link, size: 16),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      link.title,
                                      style: TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w500,
                                        color: accentColor,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                        ],

                        const SizedBox(height: 100),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // 8. Markdown Accessory Toolbar (Docked above iOS keyboard)
            if (_viewMode == 0)
              MarkdownToolbar(
                controller: _contentController,
                focusNode: _contentFocusNode,
              ),
          ],
        ),
      ),
    );
  }
}
