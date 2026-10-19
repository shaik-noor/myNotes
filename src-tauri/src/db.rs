use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use rusqlite::{params, Connection};
use crate::fractional_index::generate_key_between;
use crate::types::{
    AppSettings, BacklinkItem, BackupManifest, MoveNoteResult, Note, NoteAttachmentRow,
};

pub struct Database {
    conn: Mutex<Connection>,
}

impl Database {
    pub fn new(data_dir: PathBuf) -> Result<Self, String> {
        fs::create_dir_all(&data_dir)
            .map_err(|e| format!("Failed to create data dir: {}", e))?;

        let db_path = data_dir.join("mynotes.db");
        let conn = Connection::open(&db_path)
            .map_err(|e| format!("Failed to open database at {:?}: {}", db_path, e))?;

        conn.pragma_update(None, "journal_mode", "WAL")
            .map_err(|e| format!("Failed to set WAL mode: {}", e))?;
        conn.pragma_update(None, "foreign_keys", "ON")
            .map_err(|e| format!("Failed to enable foreign keys: {}", e))?;

        let db = Self {
            conn: Mutex::new(conn),
        };
        db.init_schema()?;
        Ok(db)
    }

    fn init_schema(&self) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute_batch(
            r#"
            CREATE TABLE IF NOT EXISTS notes (
                id TEXT PRIMARY KEY,
                caseId TEXT,
                caseNumber TEXT,
                title TEXT,
                content TEXT,
                createdAt TEXT,
                updatedAt TEXT,
                icon TEXT,
                coverImage TEXT,
                pinned INTEGER,
                tags TEXT,
                fullWidth INTEGER,
                parentId TEXT,
                sortKey TEXT,
                FOREIGN KEY (parentId) REFERENCES notes(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS note_links (
                id TEXT PRIMARY KEY,
                sourceNoteId TEXT NOT NULL,
                targetNoteId TEXT NOT NULL,
                FOREIGN KEY (sourceNoteId) REFERENCES notes(id) ON DELETE CASCADE,
                FOREIGN KEY (targetNoteId) REFERENCES notes(id) ON DELETE CASCADE,
                UNIQUE (sourceNoteId, targetNoteId)
            );

            CREATE TABLE IF NOT EXISTS note_attachments (
                id TEXT PRIMARY KEY,
                noteId TEXT,
                name TEXT,
                kind TEXT,
                ext TEXT,
                mime TEXT,
                size INTEGER,
                data TEXT,
                createdAt TEXT,
                FOREIGN KEY (noteId) REFERENCES notes(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT
            );

            CREATE TABLE IF NOT EXISTS cloud_sync (
                key TEXT PRIMARY KEY,
                value TEXT
            );

            CREATE INDEX IF NOT EXISTS idx_notes_parent ON notes(parentId);
            CREATE INDEX IF NOT EXISTS idx_notes_sort ON notes(sortKey);
            CREATE INDEX IF NOT EXISTS idx_note_links_source ON note_links(sourceNoteId);
            CREATE INDEX IF NOT EXISTS idx_note_links_target ON note_links(targetNoteId);
            CREATE INDEX IF NOT EXISTS idx_note_attachments_note ON note_attachments(noteId);
            "#,
        )
        .map_err(|e| format!("Failed to init schema: {}", e))?;
        Ok(())
    }

    pub fn load_notes(&self) -> Result<Vec<Note>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare("SELECT id, caseId, caseNumber, title, content, createdAt, updatedAt, icon, coverImage, pinned, tags, fullWidth, parentId, sortKey FROM notes")
            .map_err(|e| e.to_string())?;

        let note_iter = stmt
            .query_map([], |row| {
                let tags_str: Option<String> = row.get(10)?;
                let tags = tags_str.and_then(|s| serde_json::from_str::<Vec<String>>(&s).ok());
                let pinned_int: Option<i64> = row.get(9)?;
                let full_width_int: Option<i64> = row.get(11)?;

                Ok(Note {
                    id: row.get(0)?,
                    case_id: row.get(1)?,
                    case_number: row.get(2)?,
                    title: row.get::<_, Option<String>>(3)?.unwrap_or_default(),
                    content: row.get::<_, Option<String>>(4)?.unwrap_or_default(),
                    created_at: row.get::<_, Option<String>>(5)?.unwrap_or_default(),
                    updated_at: row.get::<_, Option<String>>(6)?.unwrap_or_default(),
                    icon: row.get(7)?,
                    cover_image: row.get(8)?,
                    pinned: pinned_int.map(|v| v == 1),
                    tags,
                    full_width: full_width_int.map(|v| v == 1),
                    parent_id: row.get(12)?,
                    sort_key: row.get(13)?,
                })
            })
            .map_err(|e| e.to_string())?;

        let mut notes = Vec::new();
        for n in note_iter {
            if let Ok(note) = n {
                notes.push(note);
            }
        }
        Ok(notes)
    }

    pub fn extract_link_targets(content: &str) -> Vec<String> {
        let mut targets = HashSet::new();
        // Match both mynotes:<id> and mydesk-note:<id>
        let prefixes = ["mynotes:", "mydesk-note:"];
        for prefix in &prefixes {
            let mut start = 0;
            while let Some(idx) = content[start..].find(prefix) {
                let actual_idx = start + idx + prefix.len();
                let rest = &content[actual_idx..];
                let id_len = rest
                    .find(|c: char| !c.is_ascii_alphanumeric() && c != '_' && c != '-')
                    .unwrap_or(rest.len());
                if id_len > 0 {
                    targets.insert(rest[..id_len].to_string());
                }
                start = actual_idx + id_len;
            }
        }
        targets.into_iter().collect()
    }

    fn reconcile_note_links(conn: &Connection, source_note_id: &str, content: &str) {
        let _ = conn.execute("DELETE FROM note_links WHERE sourceNoteId = ?", params![source_note_id]);
        let targets = Self::extract_link_targets(content);
        if targets.is_empty() {
            return;
        }

        let non_self: Vec<String> = targets.into_iter().filter(|t| t != source_note_id).collect();
        if non_self.is_empty() {
            return;
        }

        for target in non_self {
            // Check if target note exists
            let exists: bool = conn
                .query_row(
                    "SELECT 1 FROM notes WHERE id = ?",
                    params![target],
                    |_| Ok(true),
                )
                .unwrap_or(false);

            if exists {
                let link_id = format!("{:x}", rand::random::<u32>());
                let _ = conn.execute(
                    "INSERT OR IGNORE INTO note_links (id, sourceNoteId, targetNoteId) VALUES (?, ?, ?)",
                    params![link_id, source_note_id, target],
                );
            }
        }
    }

    pub fn save_notes(&self, notes_list: Vec<Note>) -> Result<(), String> {
        let mut conn = self.conn.lock().map_err(|e| e.to_string())?;
        let tx = conn.transaction().map_err(|e| e.to_string())?;

        let incoming_ids: HashSet<String> = notes_list.iter().map(|n| n.id.clone()).collect();

        // Delete notes that are no longer present
        if !incoming_ids.is_empty() {
            let placeholders = vec!["?"; incoming_ids.len()].join(",");
            let query = format!("DELETE FROM notes WHERE id NOT IN ({})", placeholders);
            let mut stmt = tx.prepare(&query).map_err(|e| e.to_string())?;
            let params: Vec<&dyn rusqlite::ToSql> = incoming_ids.iter().map(|s| s as &dyn rusqlite::ToSql).collect();
            stmt.execute(rusqlite::params_from_iter(params)).map_err(|e| e.to_string())?;
        } else {
            tx.execute("DELETE FROM notes", []).map_err(|e| e.to_string())?;
        }

        // Upsert incoming notes
        let mut upsert_stmt = tx.prepare(
            r#"
            INSERT INTO notes (
                id, caseId, caseNumber, title, content, createdAt, updatedAt,
                icon, coverImage, pinned, tags, fullWidth, parentId, sortKey
            ) VALUES (
                ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14
            ) ON CONFLICT(id) DO UPDATE SET
                caseId = excluded.caseId,
                caseNumber = excluded.caseNumber,
                title = excluded.title,
                content = excluded.content,
                createdAt = excluded.createdAt,
                updatedAt = excluded.updatedAt,
                icon = excluded.icon,
                coverImage = excluded.coverImage,
                pinned = excluded.pinned,
                tags = excluded.tags,
                fullWidth = excluded.fullWidth,
                parentId = excluded.parentId,
                sortKey = excluded.sortKey
            "#,
        ).map_err(|e| e.to_string())?;

        for note in &notes_list {
            let tags_json = note.tags.as_ref().and_then(|t| serde_json::to_string(t).ok());
            let pinned_int = note.pinned.map(|p| if p { 1 } else { 0 }).unwrap_or(0);
            let full_width_int = note.full_width.map(|f| if f { 1 } else { 0 }).unwrap_or(0);

            upsert_stmt.execute(params![
                note.id,
                note.case_id,
                note.case_number,
                note.title,
                note.content,
                note.created_at,
                note.updated_at,
                note.icon,
                note.cover_image,
                pinned_int,
                tags_json,
                full_width_int,
                note.parent_id,
                note.sort_key,
            ]).map_err(|e| e.to_string())?;
        }

        drop(upsert_stmt);

        // Reconcile links
        for note in &notes_list {
            Self::reconcile_note_links(&tx, &note.id, &note.content);
        }

        tx.commit().map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn move_note(
        &self,
        id: &str,
        new_parent_id: Option<String>,
        prev_sibling_sort_key: Option<String>,
        next_sibling_sort_key: Option<String>,
    ) -> Result<MoveNoteResult, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;

        // Cycle check
        if let Some(ref target_parent) = new_parent_id {
            if target_parent == id {
                return Err("Cannot move a page into itself".into());
            }

            let mut visited = HashSet::new();
            let mut current = Some(target_parent.clone());

            while let Some(curr_id) = current {
                if curr_id == id {
                    return Err("Cannot move a page into its own descendant".into());
                }
                if visited.contains(&curr_id) {
                    break;
                }
                visited.insert(curr_id.clone());

                let parent_of_curr: Option<String> = conn
                    .query_row(
                        "SELECT parentId FROM notes WHERE id = ?",
                        params![curr_id],
                        |r| r.get(0),
                    )
                    .unwrap_or(None);
                current = parent_of_curr;
            }
        }

        let sort_key = generate_key_between(
            prev_sibling_sort_key.as_deref(),
            next_sibling_sort_key.as_deref(),
        );
        let now = chrono::Utc::now().to_rfc3339();

        conn.execute(
            "UPDATE notes SET parentId = ?, sortKey = ?, updatedAt = ? WHERE id = ?",
            params![new_parent_id, sort_key, now, id],
        )
        .map_err(|e| e.to_string())?;

        Ok(MoveNoteResult {
            id: id.to_string(),
            parent_id: new_parent_id,
            sort_key,
        })
    }

    pub fn get_backlinks(&self, note_id: &str) -> Result<Vec<BacklinkItem>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn.prepare(
            r#"
            SELECT n.id, n.title, n.icon, n.parentId
            FROM note_links l
            JOIN notes n ON n.id = l.sourceNoteId
            WHERE l.targetNoteId = ?
            ORDER BY n.updatedAt DESC
            "#,
        ).map_err(|e| e.to_string())?;

        let items = stmt
            .query_map(params![note_id], |row| {
                Ok(BacklinkItem {
                    id: row.get(0)?,
                    title: row.get::<_, Option<String>>(1)?.unwrap_or_else(|| "Untitled".to_string()),
                    icon: row.get(2)?,
                    parent_id: row.get(3)?,
                })
            })
            .map_err(|e| e.to_string())?
            .filter_map(Result::ok)
            .collect();

        Ok(items)
    }

    pub fn get_settings(&self) -> Result<AppSettings, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let val: Option<String> = conn
            .query_row(
                "SELECT value FROM settings WHERE key = 'app_settings'",
                [],
                |r| r.get(0),
            )
            .ok();

        if let Some(json_str) = val {
            if let Ok(settings) = serde_json::from_str::<AppSettings>(&json_str) {
                return Ok(settings);
            }
        }
        Ok(AppSettings::default())
    }

    pub fn save_settings(&self, partial: serde_json::Value) -> Result<AppSettings, String> {
        let current = self.get_settings()?;
        let mut current_json = serde_json::to_value(&current).map_err(|e| e.to_string())?;

        if let (Some(curr_map), Some(part_map)) = (current_json.as_object_mut(), partial.as_object()) {
            for (k, v) in part_map {
                curr_map.insert(k.clone(), v.clone());
            }
        }

        let updated: AppSettings = serde_json::from_value(current_json).map_err(|e| e.to_string())?;
        let serialized = serde_json::to_string(&updated).map_err(|e| e.to_string())?;

        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO settings (key, value) VALUES ('app_settings', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            params![serialized],
        ).map_err(|e| e.to_string())?;

        Ok(updated)
    }

    // Attachments
    pub fn save_note_attachment(&self, row: &NoteAttachmentRow) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            r#"
            INSERT INTO note_attachments (id, noteId, name, kind, ext, mime, size, data, createdAt)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                kind = excluded.kind,
                ext = excluded.ext,
                mime = excluded.mime,
                size = excluded.size,
                data = excluded.data
            "#,
            params![
                row.id,
                row.note_id,
                row.name,
                row.kind,
                row.ext,
                row.mime,
                row.size.map(|s| s as i64),
                row.data,
                row.created_at,
            ],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn get_note_attachment(&self, id: &str) -> Result<Option<NoteAttachmentRow>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let res = conn.query_row(
            "SELECT id, noteId, name, kind, ext, mime, size, data, createdAt FROM note_attachments WHERE id = ?",
            params![id],
            |r| {
                let size_int: Option<i64> = r.get(6)?;
                Ok(NoteAttachmentRow {
                    id: r.get(0)?,
                    note_id: r.get(1)?,
                    name: r.get(2)?,
                    kind: r.get(3)?,
                    ext: r.get(4)?,
                    mime: r.get(5)?,
                    size: size_int.map(|s| s as usize),
                    data: r.get(7)?,
                    created_at: r.get(8)?,
                })
            },
        );

        match res {
            Ok(row) => Ok(Some(row)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.to_string()),
        }
    }

    pub fn list_note_attachments(&self, note_id: &str) -> Result<Vec<NoteAttachmentRow>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn.prepare(
            "SELECT id, noteId, name, kind, ext, mime, size, data, createdAt FROM note_attachments WHERE noteId = ? ORDER BY createdAt DESC"
        ).map_err(|e| e.to_string())?;

        let rows = stmt.query_map(params![note_id], |r| {
            let size_int: Option<i64> = r.get(6)?;
            Ok(NoteAttachmentRow {
                id: r.get(0)?,
                note_id: r.get(1)?,
                name: r.get(2)?,
                kind: r.get(3)?,
                ext: r.get(4)?,
                mime: r.get(5)?,
                size: size_int.map(|s| s as usize),
                data: r.get(7)?,
                created_at: r.get(8)?,
            })
        }).map_err(|e| e.to_string())?
        .filter_map(Result::ok)
        .collect();

        Ok(rows)
    }

    pub fn delete_note_attachment(&self, id: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM note_attachments WHERE id = ?", params![id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    // Cloud sync KV
    pub fn get_cloud_sync_value(&self, key: &str) -> Result<Option<String>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let val: Option<String> = conn
            .query_row(
                "SELECT value FROM cloud_sync WHERE key = ?",
                params![key],
                |r| r.get(0),
            )
            .ok();
        Ok(val)
    }

    pub fn set_cloud_sync_value(&self, key: &str, value: Option<&str>) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        if let Some(v) = value {
            conn.execute(
                "INSERT INTO cloud_sync (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                params![key, v],
            ).map_err(|e| e.to_string())?;
        } else {
            conn.execute("DELETE FROM cloud_sync WHERE key = ?", params![key])
                .map_err(|e| e.to_string())?;
        }
        Ok(())
    }

    pub fn clear_cloud_sync(&self) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM cloud_sync", []).map_err(|e| e.to_string())?;
        Ok(())
    }

    // Backup & Restore
    pub fn export_backup(&self) -> Result<BackupManifest, String> {
        let notes = self.load_notes()?;
        let conn = self.conn.lock().map_err(|e| e.to_string())?;

        let mut stmt = conn.prepare("SELECT id, noteId, name, kind, ext, mime, size, data, createdAt FROM note_attachments")
            .map_err(|e| e.to_string())?;

        let mut note_attachments: HashMap<String, Vec<NoteAttachmentRow>> = HashMap::new();
        let att_iter = stmt.query_map([], |r| {
            let size_int: Option<i64> = r.get(6)?;
            Ok(NoteAttachmentRow {
                id: r.get(0)?,
                note_id: r.get(1)?,
                name: r.get(2)?,
                kind: r.get(3)?,
                ext: r.get(4)?,
                mime: r.get(5)?,
                size: size_int.map(|s| s as usize),
                data: r.get(7)?,
                created_at: r.get(8)?,
            })
        }).map_err(|e| e.to_string())?;

        for att in att_iter.filter_map(Result::ok) {
            if let Some(ref note_id) = att.note_id {
                note_attachments.entry(note_id.clone()).or_default().push(att);
            }
        }

        let settings = self.get_settings().ok();

        Ok(BackupManifest {
            version: 1,
            timestamp: chrono::Utc::now().to_rfc3339(),
            notes,
            note_attachments,
            settings,
        })
    }

    pub fn import_backup(&self, manifest: BackupManifest) -> Result<usize, String> {
        let notes_count = manifest.notes.len();
        self.save_notes(manifest.notes)?;

        let mut conn = self.conn.lock().map_err(|e| e.to_string())?;
        let tx = conn.transaction().map_err(|e| e.to_string())?;

        tx.execute("DELETE FROM note_attachments", []).map_err(|e| e.to_string())?;

        let mut insert_att = tx.prepare(
            r#"
            INSERT INTO note_attachments (id, noteId, name, kind, ext, mime, size, data, createdAt)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
            "#,
        ).map_err(|e| e.to_string())?;

        for (_, att_list) in manifest.note_attachments {
            for att in att_list {
                let _ = insert_att.execute(params![
                    att.id,
                    att.note_id,
                    att.name,
                    att.kind,
                    att.ext,
                    att.mime,
                    att.size.map(|s| s as i64),
                    att.data,
                    att.created_at,
                ]);
            }
        }
        drop(insert_att);

        tx.commit().map_err(|e| e.to_string())?;

        if let Some(settings) = manifest.settings {
            let val = serde_json::to_value(settings).unwrap_or_default();
            let _ = self.save_settings(val);
        }

        Ok(notes_count)
    }

    pub fn merge_vault_from_cloud(&self, remote_manifest: BackupManifest) -> Result<(usize, bool), String> {
        let local_manifest = self.export_backup()?;
        let local_notes_map: HashMap<String, Note> = local_manifest.notes.into_iter().map(|n| (n.id.clone(), n)).collect();

        let mut changed = false;
        let mut merged_notes: Vec<Note> = Vec::new();
        let mut processed_ids = HashSet::new();

        for r_note in remote_manifest.notes {
            processed_ids.insert(r_note.id.clone());
            if let Some(l_note) = local_notes_map.get(&r_note.id) {
                let r_time = chrono::DateTime::parse_from_rfc3339(&r_note.updated_at)
                    .map(|d| d.timestamp_millis())
                    .unwrap_or(0);
                let l_time = chrono::DateTime::parse_from_rfc3339(&l_note.updated_at)
                    .map(|d| d.timestamp_millis())
                    .unwrap_or(0);

                if r_time > l_time {
                    merged_notes.push(r_note);
                    changed = true;
                } else {
                    merged_notes.push(l_note.clone());
                }
            } else {
                merged_notes.push(r_note);
                changed = true;
            }
        }

        for (id, l_note) in local_notes_map {
            if !processed_ids.contains(&id) {
                merged_notes.push(l_note);
            }
        }

        let total_count = merged_notes.len();
        if changed {
            self.save_notes(merged_notes)?;
        }

        // Merge attachments
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn.prepare("SELECT id FROM note_attachments").map_err(|e| e.to_string())?;
        let existing_ids: HashSet<String> = stmt
            .query_map([], |r| r.get(0))
            .map_err(|e| e.to_string())?
            .filter_map(Result::ok)
            .collect();
        drop(stmt);

        for (_, att_list) in remote_manifest.note_attachments {
            for att in att_list {
                if !existing_ids.contains(&att.id) {
                    let _ = conn.execute(
                        "INSERT INTO note_attachments (id, noteId, name, kind, ext, mime, size, data, createdAt) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                        params![
                            att.id,
                            att.note_id,
                            att.name,
                            att.kind,
                            att.ext,
                            att.mime,
                            att.size.map(|s| s as i64),
                            att.data,
                            att.created_at,
                        ],
                    );
                    changed = true;
                }
            }
        }

        Ok((total_count, changed))
    }
}
