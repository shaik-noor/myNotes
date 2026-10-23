import 'dart:async';
import 'package:flutter/cupertino.dart';
import 'package:uuid/uuid.dart';
import '../models/note.dart';
import '../services/storage_service.dart';
import 'sync_provider.dart';

class NotesProvider extends ChangeNotifier {
  final StorageService _storage;
  SyncProvider? _syncProvider;

  List<Note> _notes = [];
  String _searchQuery = '';
  String? _selectedTag;
  int _activeSegmentIndex = 0; // 0: All, 1: Pinned, 2: Folders, 3: Tags
  Timer? _autoSyncDebounce;

  NotesProvider(this._storage) {
    _loadFromLocal();
  }

  void attachSyncProvider(SyncProvider syncProvider) {
    _syncProvider = syncProvider;
  }

  void _loadFromLocal() {
    _notes = _storage.loadNotes();
    notifyListeners();
  }

  void replaceNotesFromSync(List<Note> newNotes) {
    final deleted = _storage.loadDeletedNoteIds();
    _notes = newNotes.where((n) => !deleted.contains(n.id)).toList();
    _storage.saveNotes(_notes);
    notifyListeners();
  }

  List<Note> get notes => _notes;
  String get searchQuery => _searchQuery;
  String? get selectedTag => _selectedTag;
  int get activeSegmentIndex => _activeSegmentIndex;

  void setSearchQuery(String query) {
    _searchQuery = query.trim();
    notifyListeners();
  }

  void setSelectedTag(String? tag) {
    _selectedTag = tag;
    notifyListeners();
  }

  void setActiveSegmentIndex(int index) {
    _activeSegmentIndex = index;
    notifyListeners();
  }

  /// Filtered notes based on search query, selected segment, and selected tag
  List<Note> get filteredNotes {
    var result = List<Note>.from(_notes);

    // Segment filter
    if (_activeSegmentIndex == 1) {
      // Pinned
      result = result.where((n) => n.isPinned).toList();
    } else if (_activeSegmentIndex == 2) {
      // Root level Notebooks/Folders
      result = result
          .where((n) => n.parentId == null || n.parentId!.isEmpty)
          .toList();
    }

    // Tag filter
    if (_selectedTag != null && _selectedTag!.isNotEmpty) {
      result = result.where((n) => n.tagList.contains(_selectedTag)).toList();
    }

    // Search query filter
    if (_searchQuery.isNotEmpty) {
      final q = _searchQuery.toLowerCase();
      result = result.where((n) {
        return n.title.toLowerCase().contains(q) ||
            n.content.toLowerCase().contains(q) ||
            n.tagList.any((t) => t.toLowerCase().contains(q));
      }).toList();
    }

    // Sort: Pinned first (unless in pinned segment), then most recently updated
    result.sort((a, b) {
      if (_activeSegmentIndex != 1) {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
      }
      return b.updatedAt.compareTo(a.updatedAt);
    });

    return result;
  }

  List<Note> get pinnedNotes => _notes.where((n) => n.isPinned).toList()
    ..sort((a, b) => b.updatedAt.compareTo(a.updatedAt));

  List<Note> get recentNotes {
    final list = List<Note>.from(_notes);
    list.sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
    return list.take(10).toList();
  }

  /// All unique tags and their counts
  Map<String, int> get tagsWithCounts {
    final counts = <String, int>{};
    for (final note in _notes) {
      for (final tag in note.tagList) {
        counts[tag] = (counts[tag] ?? 0) + 1;
      }
    }
    return counts;
  }

  Note? getNoteById(String id) {
    try {
      return _notes.firstWhere((n) => n.id == id);
    } catch (_) {
      return null;
    }
  }

  List<Note> getSubpages(String parentId) {
    return _notes.where((n) => n.parentId == parentId).toList()
      ..sort((a, b) => (a.title).compareTo(b.title));
  }

  List<Note> getAncestors(String noteId) {
    final note = getNoteById(noteId);
    if (note == null || note.parentId == null || note.parentId!.isEmpty) {
      return [];
    }

    final chain = <Note>[];
    final visited = <String>{};
    String? current = note.parentId;

    while (
        current != null && current.isNotEmpty && !visited.contains(current)) {
      visited.add(current);
      final parent = getNoteById(current);
      if (parent == null) break;
      chain.insert(0, parent);
      current = parent.parentId;
    }

    return chain;
  }

  List<Note> getBacklinks(String targetNoteId) {
    final target = getNoteById(targetNoteId);
    if (target == null) return [];

    final targetTitle = target.title.trim().toLowerCase();
    if (targetTitle.isEmpty) return [];

    final mention = '[[$targetTitle]]';
    return _notes.where((n) {
      if (n.id == targetNoteId) return false;
      return n.content.toLowerCase().contains(mention) ||
          n.content.toLowerCase().contains('[[${target.title.toLowerCase()}]]');
    }).toList();
  }

  // --- CRUD Operations ---

  Future<Note> createNote({
    String? title,
    String? content,
    String? parentId,
    String? icon,
    String? coverImage,
    List<String>? tags,
    bool? fullWidth,
  }) async {
    final now = DateTime.now().toUtc().toIso8601String();
    final newNote = Note(
      id: const Uuid().v4(),
      title:
          (title == null || title.trim().isEmpty) ? 'Untitled' : title.trim(),
      content: content ?? '',
      createdAt: now,
      updatedAt: now,
      parentId: parentId,
      icon: icon ?? '📝',
      coverImage: coverImage,
      tags: tags ?? [],
      fullWidth: fullWidth ?? false,
      pinned: false,
    );

    _notes.insert(0, newNote);
    await _storage.saveNotes(_notes);
    notifyListeners();
    _triggerAutoSync();
    return newNote;
  }

  Future<Note> createChildPage(String parentId, {String? initialTitle}) async {
    return createNote(
      parentId: parentId,
      title: initialTitle ?? 'Untitled Subpage',
      icon: '📄',
    );
  }

  Future<void> updateNote(Note updatedNote) async {
    final index = _notes.indexWhere((n) => n.id == updatedNote.id);
    if (index == -1) return;

    final noteWithTimestamp = updatedNote.copyWith(
      updatedAt: DateTime.now().toUtc().toIso8601String(),
    );

    _notes[index] = noteWithTimestamp;
    await _storage.saveNotes(_notes);
    notifyListeners();
    _triggerAutoSync();
  }

  Future<void> deleteNote(String id) async {
    // Delete note and all recursive descendant children
    final idsToDelete = <String>{id};
    final queue = [id];

    while (queue.isNotEmpty) {
      final pid = queue.removeAt(0);
      for (final note in _notes) {
        if (note.parentId == pid && !idsToDelete.contains(note.id)) {
          idsToDelete.add(note.id);
          queue.add(note.id);
        }
      }
    }

    final deleted = _storage.loadDeletedNoteIds()..addAll(idsToDelete);
    if (!await _storage.saveDeletedNoteIds(deleted)) {
      throw Exception('Could not save deletion');
    }

    final attachments = _storage.loadAttachments();
    final deletedAttachmentIds = _storage.loadDeletedAttachmentIds();
    var attsModified = false;
    for (final did in idsToDelete) {
      if (attachments.containsKey(did)) {
        for (final att in attachments[did]!) {
          deletedAttachmentIds.add(att.id);
        }
        attachments.remove(did);
        attsModified = true;
      }
    }
    if (attsModified) {
      await _storage.saveDeletedAttachmentIds(deletedAttachmentIds);
      await _storage.saveAttachments(attachments);
    }

    _notes.removeWhere((n) => idsToDelete.contains(n.id));
    await _storage.saveNotes(_notes);
    notifyListeners();
    _triggerAutoSync();
  }

  Future<void> togglePin(String id) async {
    final note = getNoteById(id);
    if (note == null) return;
    await updateNote(note.copyWith(pinned: !(note.pinned ?? false)));
  }

  void _triggerAutoSync() {
    if (_syncProvider == null ||
        !_syncProvider!.isConnected ||
        !_syncProvider!.autoSync) {
      return;
    }

    _autoSyncDebounce?.cancel();
    _autoSyncDebounce = Timer(const Duration(seconds: 2), () {
      _syncProvider?.syncNow(
        currentNotes: _notes,
        onVaultMerged: (merged) {
          _notes = List.from(merged);
          notifyListeners();
        },
      );
    });
  }

  @override
  void dispose() {
    _autoSyncDebounce?.cancel();
    super.dispose();
  }
}
