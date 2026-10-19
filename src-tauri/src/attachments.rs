use std::fs;
use std::path::{Path, PathBuf};
use base64::engine::general_purpose::STANDARD as BASE64;
use base64::Engine;
use crate::db::Database;
use crate::types::{NoteAttachment, NoteAttachmentKind, NoteAttachmentRow};

const MAX_ATTACHMENT_BYTES: usize = 25 * 1024 * 1024;

const TEXT_EXTS: &[&str] = &[
    "txt", "md", "markdown", "json", "yaml", "yml", "xml", "html", "htm", "css",
    "js", "jsx", "ts", "tsx", "py", "java", "c", "cpp", "h", "cs", "go", "rs",
    "rb", "php", "sh", "bash", "sql", "ini", "conf", "toml", "log", "csv",
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

pub fn staging_dir(data_dir: &Path, note_id: &str) -> PathBuf {
    data_dir.join("note-attachments").join(note_id)
}

pub fn sanitize_name(name: &str) -> String {
    let cleaned: String = name
        .chars()
        .map(|c| match c {
            '/' | '\\' | '?' | '%' | '*' | ':' | '|' | '"' | '<' | '>' => '_',
            _ => c,
        })
        .collect();
    let trimmed = cleaned.trim();
    if trimmed.is_empty() {
        "attachment".to_string()
    } else {
        trimmed.to_string()
    }
}

pub fn ensure_disk_mirror(
    data_dir: &Path,
    note_id: &str,
    name: &str,
    bytes: &[u8],
) -> Result<PathBuf, String> {
    let dir = staging_dir(data_dir, note_id);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let target = dir.join(name);
    fs::write(&target, bytes).map_err(|e| e.to_string())?;
    Ok(target)
}

pub fn materialize_row(data_dir: &Path, row: &NoteAttachmentRow) -> Option<PathBuf> {
    let note_id = row.note_id.as_deref()?;
    let name = row.name.as_deref()?;
    let data = row.data.as_deref()?;

    let dir = staging_dir(data_dir, note_id);
    let target = dir.join(name);
    if target.exists() {
        return Some(target);
    }

    if fs::create_dir_all(&dir).is_ok() {
        if let Ok(bytes) = BASE64.decode(data) {
            if fs::write(&target, bytes).is_ok() {
                return Some(target);
            }
        }
    }
    None
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
                    "File exceeds 25 MB cap ({:.1} MB)",
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
        let staged_path = match ensure_disk_mirror(data_dir, note_id, &name, &bytes) {
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
                "Attachment exceeds 25 MB cap ({:.1} MB)",
                (bytes.len() as f64) / (1024.0 * 1024.0)
            )),
            created_at: None,
        };
    }

    let id = format!("{:016x}", rand::random::<u64>());
    let staged_path = match ensure_disk_mirror(data_dir, note_id, &safe_name, &bytes) {
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

pub fn list_attachments(data_dir: &Path, db: &Database, note_id: &str) -> Vec<NoteAttachment> {
    let rows = db.list_note_attachments(note_id).unwrap_or_default();
    let mut items = Vec::new();

    for r in rows {
        let ext = r.ext.clone().unwrap_or_default();
        let kind = classify_kind(&ext);
        let mime = r.mime.clone().unwrap_or_else(|| guess_mime(&ext).to_string());
        let disk_path = materialize_row(data_dir, &r).map(|p| p.to_string_lossy().to_string());

        items.push(NoteAttachment {
            id: Some(r.id),
            note_id: r.note_id,
            name: r.name.unwrap_or_else(|| "attachment".to_string()),
            size: r.size.unwrap_or(0),
            kind: Some(kind),
            ext: Some(ext),
            mime: Some(mime),
            path: disk_path,
            preview_data_url: None,
            error: None,
            created_at: r.created_at,
        });
    }

    items
}

pub fn remove_attachment(data_dir: &Path, db: &Database, id: &str) -> Result<(), String> {
    if let Ok(Some(row)) = db.get_note_attachment(id) {
        db.delete_note_attachment(id)?;
        if let (Some(note_id), Some(name)) = (row.note_id, row.name) {
            let disk_path = staging_dir(data_dir, &note_id).join(name);
            if disk_path.exists() {
                let _ = fs::remove_file(disk_path);
            }
        }
    }
    Ok(())
}
