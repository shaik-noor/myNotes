/// Represents a single Note in MyNotes.
/// Serialization strictly matches the desktop Tauri Rust `Note` struct and `BackupManifest`.
class Note {
  final String id;
  final String? caseId;
  final String? caseNumber;
  final String title;
  final String content;
  final String createdAt;
  final String updatedAt;
  final String? icon;
  final String? coverImage;
  final bool? pinned;
  final List<String>? tags;
  final bool? fullWidth;
  final String? parentId;
  final String? sortKey;

  const Note({
    required this.id,
    this.caseId,
    this.caseNumber,
    required this.title,
    required this.content,
    required this.createdAt,
    required this.updatedAt,
    this.icon,
    this.coverImage,
    this.pinned,
    this.tags,
    this.fullWidth,
    this.parentId,
    this.sortKey,
  });

  bool get isPinned => pinned ?? false;
  bool get isFullWidth => fullWidth ?? false;
  List<String> get tagList => tags ?? const [];

  /// Returns true if this note has children/subpages
  bool hasParent() => parentId != null && parentId!.isNotEmpty;

  Note copyWith({
    String? id,
    String? caseId,
    String? caseNumber,
    String? title,
    String? content,
    String? createdAt,
    String? updatedAt,
    String? icon,
    String? coverImage,
    bool? pinned,
    List<String>? tags,
    bool? fullWidth,
    String? parentId,
    String? sortKey,
  }) {
    return Note(
      id: id ?? this.id,
      caseId: caseId ?? this.caseId,
      caseNumber: caseNumber ?? this.caseNumber,
      title: title ?? this.title,
      content: content ?? this.content,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      icon: icon ?? this.icon,
      coverImage: coverImage ?? this.coverImage,
      pinned: pinned ?? this.pinned,
      tags: tags ?? (this.tags != null ? List<String>.from(this.tags!) : null),
      fullWidth: fullWidth ?? this.fullWidth,
      parentId: parentId ?? this.parentId,
      sortKey: sortKey ?? this.sortKey,
    );
  }

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{
      'id': id,
      'title': title,
      'content': content,
      'createdAt': createdAt,
      'updatedAt': updatedAt,
    };

    if (caseId != null) map['caseId'] = caseId;
    if (caseNumber != null) map['caseNumber'] = caseNumber;
    if (icon != null) map['icon'] = icon;
    if (coverImage != null) map['coverImage'] = coverImage;
    if (pinned != null) map['pinned'] = pinned;
    if (tags != null) map['tags'] = tags;
    if (fullWidth != null) map['fullWidth'] = fullWidth;
    if (parentId != null) map['parentId'] = parentId;
    if (sortKey != null) map['sortKey'] = sortKey;

    return map;
  }

  factory Note.fromJson(Map<String, dynamic> json) {
    List<String>? parseTags(dynamic tagsRaw) {
      if (tagsRaw is List) {
        return tagsRaw.map((e) => e.toString()).toList();
      }
      return null;
    }

    return Note(
      id: json['id'] as String? ?? '',
      caseId: json['caseId'] as String?,
      caseNumber: json['caseNumber'] as String?,
      title: json['title'] as String? ?? '',
      content: json['content'] as String? ?? '',
      createdAt: json['createdAt'] as String? ?? DateTime.now().toUtc().toIso8601String(),
      updatedAt: json['updatedAt'] as String? ?? DateTime.now().toUtc().toIso8601String(),
      icon: json['icon'] as String?,
      coverImage: json['coverImage'] as String?,
      pinned: json['pinned'] as bool?,
      tags: parseTags(json['tags']),
      fullWidth: json['fullWidth'] as bool?,
      parentId: json['parentId'] as String?,
      sortKey: json['sortKey'] as String?,
    );
  }

  @override
  String toString() => 'Note(id: $id, title: $title, updatedAt: $updatedAt)';

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Note &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          title == other.title &&
          content == other.content &&
          updatedAt == other.updatedAt;

  @override
  int get hashCode => id.hashCode ^ title.hashCode ^ updatedAt.hashCode;
}
