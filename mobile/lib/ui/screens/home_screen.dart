import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../constants/app_colors.dart';
import '../../models/note.dart';
import '../../providers/notes_provider.dart';
import '../../providers/sync_provider.dart';
import '../../providers/settings_provider.dart';
import '../widgets/note_list_item.dart';
import '../widgets/sync_status_badge.dart';
import 'note_editor_screen.dart';
import 'settings_screen.dart';
import 'templates_screen.dart';
import 'quick_note_sheet.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final TextEditingController _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _openNote(BuildContext context, Note note) {
    Navigator.of(context).push(
      CupertinoPageRoute(
        builder: (_) => NoteEditorScreen(noteId: note.id),
      ),
    );
  }

  void _createNewNote(BuildContext context, {String? templateContent, String? templateTitle}) async {
    HapticFeedback.mediumImpact();
    final notesProvider = context.read<NotesProvider>();
    final newNote = await notesProvider.createNote(
      title: templateTitle ?? 'Untitled',
      content: templateContent ?? '',
    );
    if (!mounted) return;
    _openNote(context, newNote);
  }

  @override
  Widget build(BuildContext context) {
    final notesProvider = context.watch<NotesProvider>();
    final syncProvider = context.watch<SyncProvider>();
    final settingsProvider = context.watch<SettingsProvider>();
    final isDark = settingsProvider.isDarkMode(context);

    final notes = notesProvider.filteredNotes;
    final totalNotesCount = notesProvider.notes.length;
    final tags = notesProvider.tagsWithCounts;

    final accentColor = AppColors.getAccent(settingsProvider.palette, isDark);
    final bgColor = AppColors.getBackground(isDark);
    final secondaryBg = AppColors.getSecondaryBackground(isDark);

    return CupertinoPageScaffold(
      backgroundColor: bgColor,
      child: Stack(
        children: [
          CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              // 1. Collapsing iOS Large Title Navigation Bar
              CupertinoSliverNavigationBar(
                largeTitle: const Text('MyNotes'),
                backgroundColor: bgColor.withOpacity(0.85),
                border: null,
                leading: const SyncStatusBadge(),
                trailing: CupertinoButton(
                  padding: EdgeInsets.zero,
                  onPressed: () {
                    HapticFeedback.lightImpact();
                    Navigator.of(context).push(
                      CupertinoPageRoute(builder: (_) => const SettingsScreen()),
                    );
                  },
                  child: Icon(
                    CupertinoIcons.gear_alt,
                    size: 22,
                    color: accentColor,
                  ),
                ),
              ),

              // 2. iOS Pull-to-Refresh (Triggers Google Drive Sync)
              CupertinoSliverRefreshControl(
                onRefresh: () async {
                  HapticFeedback.mediumImpact();
                  if (syncProvider.isConnected) {
                    await syncProvider.syncNow(
                      currentNotes: notesProvider.notes,
                      onVaultMerged: (merged) => notesProvider.replaceNotesFromSync(merged),
                    );
                  }
                },
              ),

              // 3. Search and Segmented Filters
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: Column(
                    children: [
                      // iOS Search Field
                      CupertinoSearchTextField(
                        controller: _searchController,
                        onChanged: (q) => notesProvider.setSearchQuery(q),
                        placeholder: 'Search notes, tags, or content',
                        style: TextStyle(color: AppColors.getLabel(isDark)),
                      ),
                      const SizedBox(height: 12),

                      // Segmented Control (All, Pinned, Folders)
                      SizedBox(
                        width: double.infinity,
                        child: CupertinoSlidingSegmentedControl<int>(
                          groupValue: notesProvider.activeSegmentIndex,
                          children: const {
                            0: Padding(
                              padding: EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              child: Text('All Notes', style: TextStyle(fontSize: 13)),
                            ),
                            1: Padding(
                              padding: EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              child: Text('Pinned', style: TextStyle(fontSize: 13)),
                            ),
                            2: Padding(
                              padding: EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              child: Text('Notebooks', style: TextStyle(fontSize: 13)),
                            ),
                          },
                          onValueChanged: (val) {
                            if (val != null) {
                              HapticFeedback.selectionClick();
                              notesProvider.setActiveSegmentIndex(val);
                            }
                          },
                        ),
                      ),

                      // Tag Filter Pills if any tags exist
                      if (tags.isNotEmpty) ...[
                        const SizedBox(height: 10),
                        SizedBox(
                          height: 30,
                          child: ListView(
                            scrollDirection: Axis.horizontal,
                            children: [
                              GestureDetector(
                                onTap: () => notesProvider.setSelectedTag(null),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                  margin: const EdgeInsets.only(right: 6),
                                  decoration: BoxDecoration(
                                    color: notesProvider.selectedTag == null
                                        ? accentColor
                                        : secondaryBg,
                                    borderRadius: BorderRadius.circular(15),
                                  ),
                                  child: Text(
                                    'All Tags',
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                      color: notesProvider.selectedTag == null
                                          ? CupertinoColors.white
                                          : AppColors.getLabel(isDark),
                                    ),
                                  ),
                                ),
                              ),
                              ...tags.entries.map((e) {
                                final isSelected = notesProvider.selectedTag == e.key;
                                return GestureDetector(
                                  onTap: () => notesProvider.setSelectedTag(
                                    isSelected ? null : e.key,
                                  ),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                    margin: const EdgeInsets.only(right: 6),
                                    decoration: BoxDecoration(
                                      color: isSelected ? accentColor : secondaryBg,
                                      borderRadius: BorderRadius.circular(15),
                                    ),
                                    child: Text(
                                      '#${e.key} (${e.value})',
                                      style: TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w500,
                                        color: isSelected
                                            ? CupertinoColors.white
                                            : AppColors.getLabel(isDark),
                                      ),
                                    ),
                                  ),
                                );
                              }),
                            ],
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),

              // 4. Notes List or Empty State
              if (notes.isEmpty)
                SliverFillRemaining(
                  hasScrollBody: false,
                  child: Center(
                    child: Padding(
                      padding: const EdgeInsets.all(32),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            CupertinoIcons.doc_text_search,
                            size: 54,
                            color: AppColors.getSecondaryLabel(isDark).withOpacity(0.5),
                          ),
                          const SizedBox(height: 16),
                          Text(
                            notesProvider.searchQuery.isNotEmpty
                                ? 'No matching notes'
                                : (notesProvider.activeSegmentIndex == 1
                                    ? 'No pinned notes yet'
                                    : 'No notes yet'),
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w600,
                              color: AppColors.getLabel(isDark),
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            notesProvider.searchQuery.isNotEmpty
                                ? 'Try searching for something else'
                                : 'Tap the + button to create your first note or use a template',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 14,
                              color: AppColors.getSecondaryLabel(isDark),
                            ),
                          ),
                          const SizedBox(height: 20),
                          if (notesProvider.searchQuery.isEmpty)
                            CupertinoButton.filled(
                              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                              onPressed: () => _createNewNote(context),
                              child: const Text('New Note'),
                            ),
                        ],
                      ),
                    ),
                  ),
                )
              else
                SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final note = notes[index];
                      final subpages = notesProvider.getSubpages(note.id);

                      return NoteListItem(
                        note: note,
                        subpagesCount: subpages.length,
                        onTap: () => _openNote(context, note),
                        onTogglePin: () => notesProvider.togglePin(note.id),
                        onDelete: () => notesProvider.deleteNote(note.id),
                      );
                    },
                    childCount: notes.length,
                  ),
                ),

              // Bottom padding for the toolbar
              const SliverToBoxAdapter(
                child: SizedBox(height: 90),
              ),
            ],
          ),

          // 5. Native iOS Bottom Toolbar
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: (isDark ? const Color(0xF0141418) : const Color(0xF0F9F9FB)),
                border: Border(
                  top: BorderSide(
                    color: AppColors.getSeparator(isDark).withOpacity(0.4),
                    width: 0.5,
                  ),
                ),
              ),
              child: SafeArea(
                top: false,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    // Templates button
                    CupertinoButton(
                      padding: EdgeInsets.zero,
                      onPressed: () {
                        HapticFeedback.lightImpact();
                        Navigator.of(context).push(
                          CupertinoPageRoute(
                            builder: (_) => TemplatesScreen(
                              onUseTemplate: (t) => _createNewNote(
                                context,
                                templateTitle: t.title,
                                templateContent: t.content,
                              ),
                            ),
                          ),
                        );
                      },
                      child: Row(
                        children: [
                          Icon(CupertinoIcons.square_grid_2x2, size: 20, color: accentColor),
                          const SizedBox(width: 6),
                          Text(
                            'Templates',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: accentColor,
                            ),
                          ),
                        ],
                      ),
                    ),

                    // Quick Note / Scratchpad
                    CupertinoButton(
                      padding: EdgeInsets.zero,
                      onPressed: () {
                        HapticFeedback.lightImpact();
                        QuickNoteSheet.show(context);
                      },
                      child: Icon(
                        CupertinoIcons.pencil_ellipsis_rectangle,
                        size: 22,
                        color: AppColors.getSecondaryLabel(isDark),
                      ),
                    ),

                    // Middle status label
                    Text(
                      '$totalNotesCount ${totalNotesCount == 1 ? 'Note' : 'Notes'}',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                        color: AppColors.getSecondaryLabel(isDark),
                      ),
                    ),

                    // Create New Note Button
                    CupertinoButton(
                      padding: EdgeInsets.zero,
                      onPressed: () => _createNewNote(context),
                      child: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: accentColor,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          CupertinoIcons.add,
                          size: 20,
                          color: CupertinoColors.white,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
