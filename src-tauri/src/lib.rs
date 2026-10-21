use std::sync::Arc;
use tauri::Manager;

pub mod attachments;
pub mod cloud;
pub mod commands;
pub mod db;
pub mod fractional_index;
pub mod importer;
pub mod types;

pub(crate) fn apply_native_theme(app: &tauri::AppHandle, theme: &str) {
    app.set_theme(match theme {
        "dark" => Some(tauri::Theme::Dark),
        "light" => Some(tauri::Theme::Light),
        _ => None,
    });
}

#[cfg(target_os = "macos")]
fn configure_native_chrome(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        if let Err(error) = window.with_webview(|webview| {
            // Tauri runs this closure on the main thread and owns the live NSWindow.
            let window: &objc2_app_kit::NSWindow = unsafe { &*webview.ns_window().cast() };
            // A clear backing exposes black during native fullscreen transitions
            // and when AppKit reveals its title bar. Use a dynamic system color
            // so the backing follows the window's light/dark appearance.
            window.setOpaque(true);
            window.setBackgroundColor(Some(&objc2_app_kit::NSColor::windowBackgroundColor()));
            let style = window.styleMask();
            if !style.contains(objc2_app_kit::NSWindowStyleMask::FullSizeContentView) {
                window.setStyleMask(style | objc2_app_kit::NSWindowStyleMask::FullSizeContentView);
            }
            window.setTitlebarAppearsTransparent(true);
            // In fullscreen AppKit reveals a native title strip over our HTML
            // header. Give that strip a title too; keep the windowed overlay
            // title hidden so it doesn't duplicate the app header.
            window.setTitleVisibility(
                if window
                    .styleMask()
                    .contains(objc2_app_kit::NSWindowStyleMask::FullScreen)
                {
                    objc2_app_kit::NSWindowTitleVisibility::Visible
                } else {
                    objc2_app_kit::NSWindowTitleVisibility::Hidden
                },
            );
            if objc2::available!(macos = 11.0) {
                window.setTitlebarSeparatorStyle(objc2_app_kit::NSTitlebarSeparatorStyle::None);
            }
        }) {
            log::warn!("Could not configure the native title bar: {error}");
        }
    }
}

use cloud::CloudSyncManager;
use commands::AppState;
use db::Database;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .on_window_event(|window, event| {
            #[cfg(target_os = "macos")]
            if matches!(event, tauri::WindowEvent::Resized(_)) {
                configure_native_chrome(window.app_handle());
            }
            #[cfg(not(target_os = "macos"))]
            let _ = (window, event);
        })
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir().unwrap_or_else(|_| {
                std::env::current_dir()
                    .unwrap_or_default()
                    .join(".mynotes_data")
            });

            let db = Arc::new(
                Database::new(app_data_dir.clone()).expect("Failed to initialize SQLite database"),
            );
            // Keep the native title bar and fullscreen chrome aligned with the saved app theme.
            if let Ok(settings) = db.get_settings() {
                apply_native_theme(app.handle(), &settings.theme);
            }
            #[cfg(target_os = "macos")]
            configure_native_chrome(app.handle());
            let cloud = Arc::new(CloudSyncManager::new(db.clone()));

            app.manage(AppState {
                db: db.clone(),
                cloud: cloud.clone(),
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
            commands::window_minimize,
            commands::window_maximize,
            commands::window_close,
            commands::window_is_maximized,
        ])
        .run(tauri::generate_context!())
        .expect("error while running MyNotes tauri application");
}
