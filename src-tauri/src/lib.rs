use std::sync::Arc;
use tauri::Manager;

pub mod ai;
pub mod attachments;
pub mod cloud;
pub mod commands;
pub mod db;
pub mod fractional_index;
pub mod importer;
pub mod types;

use ai::AiStreamManager;
use cloud::CloudSyncManager;
use commands::AppState;
use db::Database;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .unwrap_or_else(|_| std::env::current_dir().unwrap_or_default().join(".mynotes_data"));

            let db = Arc::new(
                Database::new(app_data_dir.clone())
                    .expect("Failed to initialize SQLite database"),
            );
            let cloud = Arc::new(CloudSyncManager::new(db.clone()));
            let ai = Arc::new(AiStreamManager::default());

            app.manage(AppState {
                db: db.clone(),
                cloud: cloud.clone(),
                ai,
                data_dir: app_data_dir,
            });

            // Periodic background sync
            let cloud_clone = cloud.clone();
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
                if cloud_clone.is_connected() {
                    let _ = cloud_clone.sync_now(&handle).await;
                }

                loop {
                    tokio::time::sleep(tokio::time::Duration::from_secs(300)).await;
                    if cloud_clone.is_connected() {
                        let _ = cloud_clone.sync_now(&handle).await;
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::storage_load,
            commands::storage_save,
            commands::notes_load,
            commands::notes_save,
            commands::notes_move,
            commands::notes_get_backlinks,
            commands::notes_import_local_file,
            commands::attachment_attach_paths,
            commands::attachment_attach_bytes,
            commands::attachment_list,
            commands::attachment_get_data_url,
            commands::attachment_save_as,
            commands::attachment_open,
            commands::attachment_reveal,
            commands::attachment_remove,
            commands::app_get_settings,
            commands::app_save_settings,
            commands::backup_export,
            commands::backup_import,
            commands::cloud_get_config,
            commands::cloud_set_auto_sync,
            commands::cloud_login,
            commands::cloud_logout,
            commands::cloud_sync_now,
            commands::ai_chat_completion_stream,
            commands::ai_cancel_stream,
            commands::window_minimize,
            commands::window_maximize,
            commands::window_close,
            commands::window_is_maximized,
        ])
        .run(tauri::generate_context!())
        .expect("error while running myNotes tauri application");
}
