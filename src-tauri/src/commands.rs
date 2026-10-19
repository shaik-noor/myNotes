use std::path::PathBuf;
use std::sync::Arc;
use base64::engine::general_purpose::STANDARD as BASE64;
use base64::Engine;
use tauri::{AppHandle, State, Window};
use tauri_plugin_opener::OpenerExt;
use crate::ai::AiStreamManager;
use crate::attachments;
use crate::cloud::CloudSyncManager;
use crate::db::Database;
use crate::importer;
use crate::types::{
    AppSettings, BacklinkItem, BackupManifest, CloudSyncConfig, CloudSyncResult, MoveNoteResult,
    Note, NoteAttachment, NoteImportResult, ResultResponse,
};

pub struct AppState {
    pub db: Arc<Database>,
    pub cloud: Arc<CloudSyncManager>,
    pub ai: Arc<AiStreamManager>,
    pub data_dir: PathBuf,
}

#[tauri::command]
pub async fn storage_load(state: State<'_, AppState>, key: String) -> Result<ResultResponse<serde_json::Value>, ()> {
    if key == "notes" {
        match state.db.load_notes() {
            Ok(notes) => Ok(ResultResponse::ok(serde_json::to_value(notes).unwrap_or_default())),
            Err(e) => Ok(ResultResponse::err(e)),
        }
    } else if key == "settings" {
        match state.db.get_settings() {
            Ok(settings) => Ok(ResultResponse::ok(serde_json::to_value(settings).unwrap_or_default())),
            Err(e) => Ok(ResultResponse::err(e)),
        }
    } else {
        Ok(ResultResponse::ok(serde_json::Value::Null))
    }
}

#[tauri::command]
pub async fn storage_save(
    state: State<'_, AppState>,
    key: String,
    data: serde_json::Value,
) -> Result<ResultResponse<()>, ()> {
    if key == "notes" {
        if let Ok(notes) = serde_json::from_value::<Vec<Note>>(data) {
            match state.db.save_notes(notes) {
                Ok(_) => Ok(ResultResponse::ok_void()),
                Err(e) => Ok(ResultResponse::err(e)),
            }
        } else {
            Ok(ResultResponse::err("Invalid note payload"))
        }
    } else if key == "settings" {
        match state.db.save_settings(data) {
            Ok(_) => Ok(ResultResponse::ok_void()),
            Err(e) => Ok(ResultResponse::err(e)),
        }
    } else {
        Ok(ResultResponse::ok_void())
    }
}

#[tauri::command]
pub async fn notes_load(state: State<'_, AppState>) -> Result<ResultResponse<Vec<Note>>, ()> {
    match state.db.load_notes() {
        Ok(notes) => Ok(ResultResponse::ok(notes)),
        Err(e) => Ok(ResultResponse::err(e)),
    }
}

#[tauri::command]
pub async fn notes_save(
    state: State<'_, AppState>,
    app_handle: AppHandle,
    notes_list: Vec<Note>,
) -> Result<ResultResponse<()>, ()> {
    match state.db.save_notes(notes_list) {
        Ok(_) => {
            // Trigger background cloud auto-sync if enabled
            if state.cloud.is_connected() {
                let cloud = state.cloud.clone();
                let handle = app_handle.clone();
                tokio::spawn(async move {
                    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
                    let _ = cloud.sync_now(&handle).await;
                });
            }
            Ok(ResultResponse::ok_void())
        }
        Err(e) => Ok(ResultResponse::err(e)),
    }
}

#[tauri::command]
pub async fn notes_move(
    state: State<'_, AppState>,
    id: String,
    new_parent_id: Option<String>,
    prev_sibling_sort_key: Option<String>,
    next_sibling_sort_key: Option<String>,
) -> Result<ResultResponse<MoveNoteResult>, ()> {
    match state.db.move_note(&id, new_parent_id, prev_sibling_sort_key, next_sibling_sort_key) {
        Ok(res) => Ok(ResultResponse::ok(res)),
        Err(e) => Ok(ResultResponse::err(e)),
    }
}

#[tauri::command]
pub async fn notes_get_backlinks(
    state: State<'_, AppState>,
    note_id: String,
) -> Result<ResultResponse<Vec<BacklinkItem>>, ()> {
    match state.db.get_backlinks(&note_id) {
        Ok(links) => Ok(ResultResponse::ok(links)),
        Err(e) => Ok(ResultResponse::err(e)),
    }
}

#[tauri::command]
pub async fn notes_import_local_file(
    file_path: String,
) -> Result<ResultResponse<NoteImportResult>, ()> {
    match importer::import_file_content(&file_path) {
        Ok(res) => Ok(ResultResponse::ok(res)),
        Err(e) => Ok(ResultResponse::err(e)),
    }
}

#[tauri::command]
pub async fn attachment_attach_paths(
    state: State<'_, AppState>,
    note_id: String,
    paths: Vec<String>,
) -> Result<ResultResponse<Vec<NoteAttachment>>, ()> {
    let res = attachments::stage_from_paths(&state.data_dir, &state.db, &note_id, paths);
    Ok(ResultResponse::ok(res))
}

#[tauri::command]
pub async fn attachment_attach_bytes(
    state: State<'_, AppState>,
    note_id: String,
    name: String,
    bytes: Vec<u8>,
) -> Result<ResultResponse<NoteAttachment>, ()> {
    let res = attachments::stage_from_bytes(&state.data_dir, &state.db, &note_id, &name, bytes);
    Ok(ResultResponse::ok(res))
}

#[tauri::command]
pub async fn attachment_list(
    state: State<'_, AppState>,
    note_id: String,
) -> Result<ResultResponse<Vec<NoteAttachment>>, ()> {
    let res = attachments::list_attachments(&state.data_dir, &state.db, &note_id);
    Ok(ResultResponse::ok(res))
}

#[tauri::command]
pub async fn attachment_get_data_url(
    state: State<'_, AppState>,
    id: String,
) -> Result<ResultResponse<serde_json::Value>, ()> {
    match state.db.get_note_attachment(&id) {
        Ok(Some(row)) => {
            if let Some(data) = row.data {
                let ext = row.ext.unwrap_or_default();
                let mime = row.mime.unwrap_or_else(|| attachments::guess_mime(&ext).to_string());
                let data_url = format!("data:{};base64,{}", mime, data);
                Ok(ResultResponse::ok(serde_json::json!({
                    "mime": mime,
                    "dataUrl": data_url
                })))
            } else {
                Ok(ResultResponse::err("Attachment data missing"))
            }
        }
        Ok(None) => Ok(ResultResponse::err("Attachment not found")),
        Err(e) => Ok(ResultResponse::err(e)),
    }
}

#[tauri::command]
pub async fn attachment_save_as(
    state: State<'_, AppState>,
    id: String,
    target_path: String,
) -> Result<ResultResponse<String>, ()> {
    match state.db.get_note_attachment(&id) {
        Ok(Some(row)) => {
            if let Some(base64_data) = row.data {
                match BASE64.decode(base64_data) {
                    Ok(bytes) => match std::fs::write(&target_path, bytes) {
                        Ok(_) => Ok(ResultResponse::ok(target_path)),
                        Err(e) => Ok(ResultResponse::err(e.to_string())),
                    },
                    Err(e) => Ok(ResultResponse::err(e.to_string())),
                }
            } else {
                Ok(ResultResponse::err("Attachment data is empty"))
            }
        }
        Ok(None) => Ok(ResultResponse::err("Attachment not found")),
        Err(e) => Ok(ResultResponse::err(e)),
    }
}

#[tauri::command]
pub async fn attachment_open(
    state: State<'_, AppState>,
    app_handle: AppHandle,
    id: String,
) -> Result<ResultResponse<()>, ()> {
    match state.db.get_note_attachment(&id) {
        Ok(Some(row)) => {
            if let Some(disk_path) = attachments::materialize_row(&state.data_dir, &row) {
                let path_str = disk_path.to_string_lossy().to_string();
                let _ = app_handle.opener().open_path(&path_str, None::<&str>);
                Ok(ResultResponse::ok_void())
            } else {
                Ok(ResultResponse::err("Failed to materialize attachment"))
            }
        }
        Ok(None) => Ok(ResultResponse::err("Attachment not found")),
        Err(e) => Ok(ResultResponse::err(e)),
    }
}

#[tauri::command]
pub async fn attachment_reveal(
    state: State<'_, AppState>,
    app_handle: AppHandle,
    id: String,
) -> Result<ResultResponse<()>, ()> {
    match state.db.get_note_attachment(&id) {
        Ok(Some(row)) => {
            if let Some(disk_path) = attachments::materialize_row(&state.data_dir, &row) {
                let path_str = disk_path.to_string_lossy().to_string();
                let _ = app_handle.opener().reveal_item_in_dir(&path_str);
                Ok(ResultResponse::ok_void())
            } else {
                Ok(ResultResponse::err("Failed to materialize attachment"))
            }
        }
        Ok(None) => Ok(ResultResponse::err("Attachment not found")),
        Err(e) => Ok(ResultResponse::err(e)),
    }
}

#[tauri::command]
pub async fn attachment_remove(
    state: State<'_, AppState>,
    id: String,
) -> Result<ResultResponse<()>, ()> {
    match attachments::remove_attachment(&state.data_dir, &state.db, &id) {
        Ok(_) => Ok(ResultResponse::ok_void()),
        Err(e) => Ok(ResultResponse::err(e)),
    }
}

#[tauri::command]
pub async fn app_get_settings(state: State<'_, AppState>) -> Result<ResultResponse<AppSettings>, ()> {
    match state.db.get_settings() {
        Ok(s) => Ok(ResultResponse::ok(s)),
        Err(e) => Ok(ResultResponse::err(e)),
    }
}

#[tauri::command]
pub async fn app_save_settings(
    state: State<'_, AppState>,
    settings: serde_json::Value,
) -> Result<ResultResponse<AppSettings>, ()> {
    match state.db.save_settings(settings) {
        Ok(s) => Ok(ResultResponse::ok(s)),
        Err(e) => Ok(ResultResponse::err(e)),
    }
}

#[tauri::command]
pub async fn backup_export(
    state: State<'_, AppState>,
    target_path: String,
) -> Result<ResultResponse<String>, ()> {
    match state.db.export_backup() {
        Ok(manifest) => match serde_json::to_string_pretty(&manifest) {
            Ok(json_str) => match std::fs::write(&target_path, json_str) {
                Ok(_) => Ok(ResultResponse::ok(target_path)),
                Err(e) => Ok(ResultResponse::err(e.to_string())),
            },
            Err(e) => Ok(ResultResponse::err(e.to_string())),
        },
        Err(e) => Ok(ResultResponse::err(e)),
    }
}

#[tauri::command]
pub async fn backup_import(
    state: State<'_, AppState>,
    source_path: String,
) -> Result<ResultResponse<serde_json::Value>, ()> {
    match std::fs::read_to_string(&source_path) {
        Ok(raw) => match serde_json::from_str::<BackupManifest>(&raw) {
            Ok(manifest) => match state.db.import_backup(manifest) {
                Ok(count) => Ok(ResultResponse::ok(serde_json::json!({ "noteCount": count }))),
                Err(e) => Ok(ResultResponse::err(e)),
            },
            Err(e) => Ok(ResultResponse::err(format!("Invalid backup JSON: {}", e))),
        },
        Err(e) => Ok(ResultResponse::err(format!("Failed to read backup file: {}", e))),
    }
}

#[tauri::command]
pub async fn cloud_get_config(state: State<'_, AppState>) -> Result<ResultResponse<CloudSyncConfig>, ()> {
    Ok(ResultResponse::ok(state.cloud.get_config()))
}

#[tauri::command]
pub async fn cloud_save_credentials(
    state: State<'_, AppState>,
    client_id: Option<String>,
    client_secret: Option<String>,
    auth_server_url: Option<String>,
) -> Result<ResultResponse<()>, ()> {
    match state.cloud.save_credentials(
        client_id.as_deref(),
        client_secret.as_deref(),
        auth_server_url.as_deref(),
    ) {
        Ok(_) => Ok(ResultResponse::ok_void()),
        Err(e) => Ok(ResultResponse::err(e)),
    }
}

#[tauri::command]
pub async fn cloud_reset_credentials(
    state: State<'_, AppState>,
) -> Result<ResultResponse<()>, ()> {
    match state.cloud.reset_credentials() {
        Ok(_) => Ok(ResultResponse::ok_void()),
        Err(e) => Ok(ResultResponse::err(e)),
    }
}

#[tauri::command]
pub async fn cloud_set_auto_sync(
    state: State<'_, AppState>,
    enabled: bool,
) -> Result<ResultResponse<()>, ()> {
    match state.cloud.set_auto_sync(enabled) {
        Ok(_) => Ok(ResultResponse::ok_void()),
        Err(e) => Ok(ResultResponse::err(e)),
    }
}

#[tauri::command]
pub async fn cloud_login(
    state: State<'_, AppState>,
    app_handle: AppHandle,
) -> Result<ResultResponse<serde_json::Value>, ()> {
    match state.cloud.clone().start_login(app_handle).await {
        Ok((email, name)) => Ok(ResultResponse::ok(serde_json::json!({
            "email": email,
            "name": name
        }))),
        Err(e) => Ok(ResultResponse::err(e)),
    }
}

#[tauri::command]
pub async fn cloud_logout(state: State<'_, AppState>) -> Result<ResultResponse<()>, ()> {
    match state.cloud.logout() {
        Ok(_) => Ok(ResultResponse::ok_void()),
        Err(e) => Ok(ResultResponse::err(e)),
    }
}

#[tauri::command]
pub async fn cloud_sync_now(
    state: State<'_, AppState>,
    app_handle: AppHandle,
) -> Result<ResultResponse<CloudSyncResult>, ()> {
    match state.cloud.sync_now(&app_handle).await {
        Ok(res) => Ok(ResultResponse::ok(res)),
        Err(e) => Ok(ResultResponse::err(e)),
    }
}

#[tauri::command]
pub async fn ai_chat_completion_stream(
    state: State<'_, AppState>,
    app_handle: AppHandle,
    stream_id: String,
    _system_prompt: String,
    messages: Vec<serde_json::Value>,
) -> Result<ResultResponse<()>, ()> {
    let ai = state.ai.clone();
    tokio::spawn(async move {
        ai.stream_completion(app_handle, stream_id, messages).await;
    });
    Ok(ResultResponse::ok_void())
}

#[tauri::command]
pub async fn ai_cancel_stream(
    state: State<'_, AppState>,
    stream_id: String,
) -> Result<ResultResponse<()>, ()> {
    state.ai.cancel(&stream_id);
    Ok(ResultResponse::ok_void())
}

#[tauri::command]
pub fn window_minimize(window: Window) {
    let _ = window.minimize();
}

#[tauri::command]
pub fn window_maximize(window: Window) {
    if let Ok(maximized) = window.is_maximized() {
        if maximized {
            let _ = window.unmaximize();
        } else {
            let _ = window.maximize();
        }
    }
}

#[tauri::command]
pub fn window_close(window: Window) {
    let _ = window.close();
}

#[tauri::command]
pub fn window_is_maximized(window: Window) -> bool {
    window.is_maximized().unwrap_or(false)
}
