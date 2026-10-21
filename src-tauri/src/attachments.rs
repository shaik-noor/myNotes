use crate::db::Database;
use crate::types::{NoteAttachment, NoteAttachmentKind, NoteAttachmentRow};
use base64::engine::general_purpose::STANDARD as BASE64;
use base64::Engine;
use std::fs;
use std::path::{Component, Path, PathBuf};

const MAX_ATTACHMENT_BYTES: usize = 25 * 1024 * 1024;

const TEXT_EXTS: &[&str] = &[
    "txt", "md", "markdown", "json", "yaml", "yml", "xml", "html", "htm", "css", "js", "jsx", "ts",
    "tsx", "py", "java", "c", "cpp", "h", "cs", "go", "rs", "rb", "php", "sh", "bash", "sql",
    "ini", "conf", "toml", "log", "csv",
];

const IMAGE_EXTS: &[&str] = &[
    "png", "jpg", "jpeg", "gif", "webp", "bmp", "svg", "ico", "tif", "tiff",
];

pub fn classify_kind(ext: &str) -> NoteAttachmentKind {
    let lower = ext.to_lowercase();
    if IMAGE_EXTS.contains(&lower.as_str()) {
        NoteAttachmentKind::Image
    } else if TEXT_EXTS.contains(&lower.as_str()) {
        NoteAttachmentKind::Text
    } else {
        NoteAttachmentKind::Binary
    }
}

pub fn guess_mime(ext: &str) -> &'static str {
    match ext.to_lowercase().as_str() {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "bmp" => "image/bmp",
        "svg" => "image/svg+xml",
        "ico" => "image/x-icon",
        "pdf" => "application/pdf",
        "txt" => "text/plain",
        "md" | "markdown" => "text/markdown",
        "json" => "application/json",
        "csv" => "text/csv",
        "html" | "htm" => "text/html",
        _ => "application/octet-stream",
    }
}

fn safe_component(value: &str) -> Result<&str, String> {
    let mut components = Path::new(value).components();
    if value.is_empty()
        || value.contains(['/', '\\'])
        || value.chars().any(char::is_control)
        || !matches!(components.next(), Some(Component::Normal(_)))
        || components.next().is_some()
    {
        return Err("Invalid attachment path".to_string());
    }
    Ok(value)
}

pub fn sanitize_name(name: &str) -> String {
    let cleaned: String = name
        .chars()
        .map(|c| match c {
            '/' | '\\' | '?' | '%' | '*' | ':' | '|' | '"' | '<' | '>' => '_',
            c if c.is_control() => '_',
            _ => c,
        })
        .collect();
    let trimmed = cleaned.trim().trim_matches('.');
    if trimmed.is_empty() {
        "attachment".to_string()
    } else {
        trimmed.to_string()
    }
}

fn attachment_path(
    data_dir: &Path,
    note_id: &str,
    id: &str,
    name: &str,
) -> Result<PathBuf, String> {
    Ok(data_dir
        .join("note-attachments")
        .join(safe_component(note_id)?)
        .join(safe_component(id)?)
        .join(sanitize_name(name)))
}

pub fn ensure_disk_mirror(
    data_dir: &Path,
    note_id: &str,
    id: &str,
    name: &str,
    bytes: &[u8],
) -> Result<PathBuf, String> {
    let target = attachment_path(data_dir, note_id, id, name)?;
    fs::create_dir_all(target.parent().ok_or("Invalid attachment path")?)
        .map_err(|e| e.to_string())?;
    fs::write(&target, bytes).map_err(|e| e.to_string())?;
    Ok(target)
}

pub fn materialize_row(data_dir: &Path, row: &NoteAttachmentRow) -> Option<PathBuf> {
    let note_id = row.note_id.as_deref()?;
    let name = row.name.as_deref()?;
    let data = row.data.as_deref()?;
    if data.len() > MAX_ATTACHMENT_BYTES.div_ceil(3) * 4 {
        return None;
    }
    let bytes = BASE64.decode(data).ok()?;
    if bytes.len() > MAX_ATTACHMENT_BYTES {
        return None;
    }
    // Rebuild from the database so restoring a backup cannot reuse stale cached bytes.
    ensure_disk_mirror(data_dir, note_id, &row.id, name, &bytes).ok()
}

pub fn stage_from_paths(
    data_dir: &Path,
    db: &Database,
    note_id: &str,
    paths: Vec<String>,
) -> Vec<NoteAttachment> {
    let mut results = Vec::new();

    for file_path_str in paths {
        let p = Path::new(&file_path_str);
        let raw_name = p
            .file_name()
            .and_then(|s| s.to_str())
            .unwrap_or("attachment");
        let name = sanitize_name(raw_name);
        let ext = p
            .extension()
            .and_then(|s| s.to_str())
            .unwrap_or("")
            .to_lowercase();
        let kind = classify_kind(&ext);
        let mime = guess_mime(&ext).to_string();

        let metadata = match fs::metadata(p) {
            Ok(m) => m,
            Err(e) => {
                results.push(NoteAttachment {
                    id: None,
                    note_id: Some(note_id.to_string()),
                    name,
                    size: 0,
                    kind: Some(kind),
                    ext: Some(ext),
                    mime: Some(mime),
                    path: None,
                    preview_data_url: None,
                    error: Some(e.to_string()),
                    created_at: None,
                });
                continue;
            }
        };

        let size = metadata.len() as usize;
        if size > MAX_ATTACHMENT_BYTES {
            results.push(NoteAttachment {
                id: None,
                note_id: Some(note_id.to_string()),
                name,
                size,
                kind: Some(kind),
                ext: Some(ext),
                mime: Some(mime),
                path: None,
                preview_data_url: None,
                error: Some(format!(
                    "File exceeds 25 MB limit ({:.1} MB)",
                    (size as f64) / (1024.0 * 1024.0)
                )),
                created_at: None,
            });
            continue;
        }

        let bytes = match fs::read(p) {
            Ok(b) => b,
            Err(e) => {
                results.push(NoteAttachment {
                    id: None,
                    note_id: Some(note_id.to_string()),
                    name,
                    size,
                    kind: Some(kind),
                    ext: Some(ext),
                    mime: Some(mime),
                    path: None,
                    preview_data_url: None,
                    error: Some(e.to_string()),
                    created_at: None,
                });
                continue;
            }
        };

        let id = format!("{:016x}", rand::random::<u64>());
        let staged_path = match ensure_disk_mirror(data_dir, note_id, &id, &name, &bytes) {
            Ok(target) => target.to_string_lossy().to_string(),
            Err(e) => {
                results.push(NoteAttachment {
                    id: None,
                    note_id: Some(note_id.to_string()),
                    name,
                    size,
                    kind: Some(kind),
                    ext: Some(ext),
                    mime: Some(mime),
                    path: None,
                    preview_data_url: None,
                    error: Some(e),
                    created_at: None,
                });
                continue;
            }
        };

        let base64_data = BASE64.encode(&bytes);
        let created_at = chrono::Utc::now().to_rfc3339();

        let row = NoteAttachmentRow {
            id: id.clone(),
            note_id: Some(note_id.to_string()),
            name: Some(name.clone()),
            kind: Some(match kind {
                NoteAttachmentKind::Image => "image".to_string(),
                NoteAttachmentKind::Text => "text".to_string(),
                NoteAttachmentKind::Binary => "binary".to_string(),
            }),
            ext: Some(ext.clone()),
            mime: Some(mime.clone()),
            size: Some(size),
            data: Some(base64_data.clone()),
            created_at: Some(created_at.clone()),
        };

        if let Err(e) = db.save_note_attachment(&row) {
            results.push(NoteAttachment {
                id: None,
                note_id: Some(note_id.to_string()),
                name,
                size,
                kind: Some(kind),
                ext: Some(ext),
                mime: Some(mime),
                path: None,
                preview_data_url: None,
                error: Some(e),
                created_at: None,
            });
            continue;
        }

        let preview_data_url = if matches!(kind, NoteAttachmentKind::Image) {
            Some(format!("data:{};base64,{}", mime, base64_data))
        } else {
            None
        };

        results.push(NoteAttachment {
            id: Some(id),
            note_id: Some(note_id.to_string()),
            name,
            size,
            kind: Some(kind),
            ext: Some(ext),
            mime: Some(mime),
            path: Some(staged_path),
            preview_data_url,
            error: None,
            created_at: Some(created_at),
        });
    }

    results
}

pub fn stage_from_bytes(
    data_dir: &Path,
    db: &Database,
    note_id: &str,
    name: &str,
    bytes: Vec<u8>,
) -> NoteAttachment {
    let safe_name = sanitize_name(name);
    let ext = Path::new(&safe_name)
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("png")
        .to_lowercase();
    let kind = classify_kind(&ext);
    let mime = guess_mime(&ext).to_string();

    if bytes.len() > MAX_ATTACHMENT_BYTES {
        return NoteAttachment {
            id: None,
            note_id: Some(note_id.to_string()),
            name: safe_name,
            size: bytes.len(),
            kind: Some(kind),
            ext: Some(ext),
            mime: Some(mime),
            path: None,
            preview_data_url: None,
            error: Some(format!(
                "Attachment exceeds 25 MB limit ({:.1} MB)",
                (bytes.len() as f64) / (1024.0 * 1024.0)
            )),
            created_at: None,
        };
    }

    let id = format!("{:016x}", rand::random::<u64>());
    let staged_path = match ensure_disk_mirror(data_dir, note_id, &id, &safe_name, &bytes) {
        Ok(p) => p.to_string_lossy().to_string(),
        Err(e) => {
            return NoteAttachment {
                id: None,
                note_id: Some(note_id.to_string()),
                name: safe_name,
                size: bytes.len(),
                kind: Some(kind),
                ext: Some(ext),
                mime: Some(mime),
                path: None,
                preview_data_url: None,
                error: Some(e),
                created_at: None,
            };
        }
    };

    let base64_data = BASE64.encode(&bytes);
    let created_at = chrono::Utc::now().to_rfc3339();

    let row = NoteAttachmentRow {
        id: id.clone(),
        note_id: Some(note_id.to_string()),
        name: Some(safe_name.clone()),
        kind: Some(match kind {
            NoteAttachmentKind::Image => "image".to_string(),
            NoteAttachmentKind::Text => "text".to_string(),
            NoteAttachmentKind::Binary => "binary".to_string(),
        }),
        ext: Some(ext.clone()),
        mime: Some(mime.clone()),
        size: Some(bytes.len()),
        data: Some(base64_data.clone()),
        created_at: Some(created_at.clone()),
    };

    if let Err(e) = db.save_note_attachment(&row) {
        return NoteAttachment {
            id: None,
            note_id: Some(note_id.to_string()),
            name: safe_name,
            size: bytes.len(),
            kind: Some(kind),
            ext: Some(ext),
            mime: Some(mime),
            path: None,
            preview_data_url: None,
            error: Some(e),
            created_at: None,
        };
    }

    let preview_data_url = if matches!(kind, NoteAttachmentKind::Image) {
        Some(format!("data:{};base64,{}", mime, base64_data))
    } else {
        None
    };

    NoteAttachment {
        id: Some(id),
        note_id: Some(note_id.to_string()),
        name: safe_name,
        size: bytes.len(),
        kind: Some(kind),
        ext: Some(ext),
        mime: Some(mime),
        path: Some(staged_path),
        preview_data_url,
        error: None,
        created_at: Some(created_at),
    }
}

pub fn list_attachments(db: &Database, note_id: &str) -> Result<Vec<NoteAttachment>, String> {
    let rows = db.list_note_attachments(note_id)?;
    let mut items = Vec::new();

    for r in rows {
        let ext = r.ext.clone().unwrap_or_default();
        let kind = classify_kind(&ext);
        let mime = r
            .mime
            .clone()
            .unwrap_or_else(|| guess_mime(&ext).to_string());

        items.push(NoteAttachment {
            id: Some(r.id),
            note_id: r.note_id,
            name: r.name.unwrap_or_else(|| "attachment".to_string()),
            size: r.size.unwrap_or(0),
            kind: Some(kind),
            ext: Some(ext),
            mime: Some(mime),
            path: None,
            preview_data_url: None,
            error: None,
            created_at: r.created_at,
        });
    }

    Ok(items)
}

pub fn remove_attachment(data_dir: &Path, db: &Database, id: &str) -> Result<(), String> {
    if let Some(row) = db.get_note_attachment(id)? {
        db.delete_note_attachment(id)?;
        if let (Some(note_id), Some(name)) = (row.note_id, row.name) {
            let disk_path = attachment_path(data_dir, &note_id, &row.id, &name)?;
            if disk_path.exists() {
                fs::remove_file(disk_path).map_err(|e| e.to_string())?;
            }
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_paths_from_untrusted_note_and_attachment_ids() {
        for value in [
            "",
            ".",
            "..",
            "../escape",
            "/tmp/escape",
            "a/b",
            "a\\b",
            "bad\0id",
        ] {
            assert!(attachment_path(Path::new("/tmp/vault"), value, "id", "file.txt").is_err());
            assert!(attachment_path(Path::new("/tmp/vault"), "note", value, "file.txt").is_err());
        }
    }

    #[test]
    fn same_name_attachments_have_separate_paths() {
        let first = attachment_path(Path::new("/tmp/vault"), "note", "first", "file.txt").unwrap();
        let second =
            attachment_path(Path::new("/tmp/vault"), "note", "second", "file.txt").unwrap();
        assert_ne!(first, second);
        assert_eq!(sanitize_name(".."), "attachment");
        assert_eq!(sanitize_name("bad\0name.txt"), "bad_name.txt");
    }

    #[test]
    fn materialization_uses_database_bytes_instead_of_stale_cache() {
        let dir = std::env::temp_dir().join(format!(
            "mynotes-attachment-test-{:x}",
            rand::random::<u64>()
        ));
        let mut row: NoteAttachmentRow = serde_json::from_value(serde_json::json!({
            "id": "id", "noteId": "note", "name": "file.txt", "data": BASE64.encode(b"old")
        }))
        .unwrap();
        let first = materialize_row(&dir, &row).unwrap();
        row.data = Some(BASE64.encode(b"restored"));
        let second = materialize_row(&dir, &row).unwrap();
        assert_eq!(first, second);
        assert_eq!(fs::read(second).unwrap(), b"restored");
        fs::remove_dir_all(dir).unwrap();
    }
}
