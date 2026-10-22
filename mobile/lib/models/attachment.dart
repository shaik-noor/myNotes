/// Represents an attachment row stored in SQLite and bundled in BackupManifest.
class NoteAttachmentRow {
  final String id;
  final String? noteId;
  final String? name;
  final String? kind;
  final String? ext;
  final String? mime;
  final int? size;
  final String? data; // Base64 data
  final String? createdAt;

  const NoteAttachmentRow({
    required this.id,
    this.noteId,
    this.name,
    this.kind,
    this.ext,
    this.mime,
    this.size,
    this.data,
    this.createdAt,
  });

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      if (noteId != null) 'noteId': noteId,
      if (name != null) 'name': name,
      if (kind != null) 'kind': kind,
      if (ext != null) 'ext': ext,
      if (mime != null) 'mime': mime,
      if (size != null) 'size': size,
      if (data != null) 'data': data,
      if (createdAt != null) 'createdAt': createdAt,
    };
  }

  factory NoteAttachmentRow.fromJson(Map<String, dynamic> json) {
    return NoteAttachmentRow(
      id: json['id'] as String? ?? '',
      noteId: json['noteId'] as String?,
      name: json['name'] as String?,
      kind: json['kind'] as String?,
      ext: json['ext'] as String?,
      mime: json['mime'] as String?,
      size: json['size'] as int?,
      data: json['data'] as String?,
      createdAt: json['createdAt'] as String?,
    );
  }
}
