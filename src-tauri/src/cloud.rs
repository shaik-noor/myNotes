use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use base64::engine::general_purpose::URL_SAFE_NO_PAD as BASE64_URL;
use base64::Engine;
use rand::RngCore;
use reqwest::header::{AUTHORIZATION, CONTENT_TYPE};
use serde::Deserialize;
use sha2::{Digest, Sha256};
use tauri::{AppHandle, Emitter};
use tauri_plugin_opener::OpenerExt;
use crate::db::Database;
use crate::types::{BackupManifest, CloudSyncConfig, CloudSyncResult};

const OAUTH_AUTH_URL: &str = "https://accounts.google.com/o/oauth2/v2/auth";
const OAUTH_TOKEN_URL: &str = "https://oauth2.googleapis.com/token";
const USERINFO_URL: &str = "https://www.googleapis.com/oauth2/v3/userinfo";
const DRIVE_FILES_URL: &str = "https://www.googleapis.com/drive/v3/files";
const DRIVE_UPLOAD_URL: &str = "https://www.googleapis.com/upload/drive/v3/files";
const VAULT_FILENAME: &str = "mynotes_vault.json";
const SCOPES: &str = "https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile";

pub struct CloudSyncManager {
    db: Arc<Database>,
    is_syncing: AtomicBool,
}

#[derive(Deserialize)]
struct TokenResponse {
    access_token: String,
    refresh_token: Option<String>,
    expires_in: Option<u64>,
}

#[derive(Deserialize)]
struct UserInfoResponse {
    email: Option<String>,
    name: Option<String>,
    picture: Option<String>,
}

#[derive(Deserialize)]
struct DriveFileList {
    files: Option<Vec<DriveFileItem>>,
}

#[derive(Deserialize)]
struct DriveFileItem {
    id: String,
}

impl CloudSyncManager {
    pub fn new(db: Arc<Database>) -> Self {
        Self {
            db,
            is_syncing: AtomicBool::new(false),
        }
    }

    pub fn get_client_id(&self) -> String {
        self.db
            .get_cloud_sync_value("clientId")
            .ok()
            .flatten()
            .unwrap_or_default()
    }

    pub fn get_client_secret(&self) -> String {
        self.db
            .get_cloud_sync_value("clientSecret")
            .ok()
            .flatten()
            .unwrap_or_default()
    }

    pub fn is_connected(&self) -> bool {
        self.db
            .get_cloud_sync_value("refreshToken")
            .ok()
            .flatten()
            .is_some()
    }

    pub fn get_config(&self) -> CloudSyncConfig {
        let client_id = self.get_client_id();
        let client_secret = self.get_client_secret();
        let auto_sync_val = self.db.get_cloud_sync_value("autoSync").ok().flatten();

        CloudSyncConfig {
            client_id: if client_id.is_empty() {
                None
            } else {
                Some(format!("{}...", &client_id[..client_id.len().min(12)]))
            },
            client_secret: if client_secret.is_empty() {
                None
            } else {
                Some("••••••••".to_string())
            },
            user_email: self.db.get_cloud_sync_value("userEmail").ok().flatten(),
            user_name: self.db.get_cloud_sync_value("userName").ok().flatten(),
            user_picture: self.db.get_cloud_sync_value("userPicture").ok().flatten(),
            auto_sync: auto_sync_val.as_deref() != Some("0"),
            last_sync_time: self.db.get_cloud_sync_value("lastSyncTime").ok().flatten(),
            is_connected: self.is_connected(),
            is_syncing: self.is_syncing.load(Ordering::SeqCst),
            last_error: self.db.get_cloud_sync_value("lastError").ok().flatten(),
            file_id: self.db.get_cloud_sync_value("fileId").ok().flatten(),
        }
    }

    pub fn save_credentials(&self, client_id: &str, client_secret: Option<&str>) -> Result<(), String> {
        self.db.set_cloud_sync_value("clientId", Some(client_id.trim()))?;
        if let Some(secret) = client_secret {
            self.db.set_cloud_sync_value("clientSecret", Some(secret.trim()))?;
        }
        Ok(())
    }

    pub fn set_auto_sync(&self, enabled: bool) -> Result<(), String> {
        self.db.set_cloud_sync_value("autoSync", Some(if enabled { "1" } else { "0" }))
    }

    pub fn logout(&self) -> Result<(), String> {
        let client_id = self.get_client_id();
        let client_secret = self.get_client_secret();
        self.db.clear_cloud_sync()?;
        if !client_id.is_empty() {
            let _ = self.db.set_cloud_sync_value("clientId", Some(&client_id));
        }
        if !client_secret.is_empty() {
            let _ = self.db.set_cloud_sync_value("clientSecret", Some(&client_secret));
        }
        Ok(())
    }

    pub async fn start_login(self: Arc<Self>, app_handle: AppHandle) -> Result<(String, String), String> {
        let client_id = self.get_client_id();
        if client_id.is_empty() {
            return Err("Google Client ID is not configured. Please enter your Google Cloud OAuth Client ID in Settings -> Cloud Sync.".to_string());
        }

        let mut verifier_bytes = [0u8; 32];
        rand::thread_rng().fill_bytes(&mut verifier_bytes);
        let code_verifier = BASE64_URL.encode(verifier_bytes);

        let mut hasher = Sha256::new();
        hasher.update(code_verifier.as_bytes());
        let code_challenge = BASE64_URL.encode(hasher.finalize());

        let mut state_bytes = [0u8; 16];
        rand::thread_rng().fill_bytes(&mut state_bytes);
        let state = hex::encode(state_bytes);

        let server = tiny_http::Server::http("127.0.0.1:0")
            .map_err(|e| format!("Failed to start loopback server: {}", e))?;
        let port = server.server_addr().to_ip().map(|a| a.port()).unwrap_or(0);
        let redirect_uri = format!("http://127.0.0.1:{}/callback", port);

        let auth_url = format!(
            "{}?client_id={}&redirect_uri={}&response_type=code&scope={}&code_challenge={}&code_challenge_method=S256&state={}&access_type=offline&prompt=consent",
            OAUTH_AUTH_URL,
            urlencoding::encode(&client_id),
            urlencoding::encode(&redirect_uri),
            urlencoding::encode(SCOPES),
            urlencoding::encode(&code_challenge),
            urlencoding::encode(&state)
        );

        // Open user default browser
        let _ = app_handle.opener().open_url(&auth_url, None::<&str>);

        let manager = self.clone();
        let redirect_uri_clone = redirect_uri.clone();

        tokio::task::spawn_blocking(move || {
            for request in server.incoming_requests() {
                let url = request.url().to_string();
                if !url.starts_with("/callback") {
                    let _ = request.respond(tiny_http::Response::from_string("Not found").with_status_code(404));
                    continue;
                }

                let parsed_url = format!("http://127.0.0.1{}", url);
                let url_obj = match url::Url::parse(&parsed_url) {
                    Ok(u) => u,
                    Err(_) => {
                        let _ = request.respond(tiny_http::Response::from_string("Bad Request").with_status_code(400));
                        break;
                    }
                };

                let query_pairs: std::collections::HashMap<_, _> = url_obj.query_pairs().into_owned().collect();
                let code = query_pairs.get("code");
                let ret_state = query_pairs.get("state");
                let error_param = query_pairs.get("error");

                if let Some(err) = error_param {
                    let html = format!(
                        r#"<html><body style="font-family:-apple-system,sans-serif;background:#0f1115;color:#f87171;text-align:center;padding:60px 20px;">
                        <h2>Authentication Cancelled</h2><p>{}</p></body></html>"#,
                        err
                    );
                    let _ = request.respond(tiny_http::Response::from_string(html).with_header(
                        tiny_http::Header::from_bytes(&b"Content-Type"[..], &b"text/html; charset=utf-8"[..]).unwrap()
                    ));
                    break;
                }

                if ret_state != Some(&state) || code.is_none() {
                    let _ = request.respond(tiny_http::Response::from_string("Invalid state or code").with_status_code(400));
                    break;
                }

                let code_val = code.unwrap().clone();

                let client = reqwest::blocking::Client::new();
                let mut params = std::collections::HashMap::new();
                params.insert("client_id", manager.get_client_id());
                params.insert("client_secret", manager.get_client_secret());
                params.insert("code", code_val);
                params.insert("code_verifier", code_verifier.clone());
                params.insert("grant_type", "authorization_code".to_string());
                params.insert("redirect_uri", redirect_uri_clone.clone());

                let token_res = client.post(OAUTH_TOKEN_URL).form(&params).send();
                match token_res.and_then(|r| r.json::<TokenResponse>()) {
                    Ok(tok) => {
                        let _ = manager.db.set_cloud_sync_value("accessToken", Some(&tok.access_token));
                        if let Some(ref rt) = tok.refresh_token {
                            let _ = manager.db.set_cloud_sync_value("refreshToken", Some(rt));
                        }
                        let expiry = chrono::Utc::now().timestamp() + (tok.expires_in.unwrap_or(3600) as i64);
                        let _ = manager.db.set_cloud_sync_value("tokenExpiry", Some(&expiry.to_string()));

                        // Fetch user info
                        if let Ok(info_res) = client
                            .get(USERINFO_URL)
                            .header("Authorization", format!("Bearer {}", tok.access_token))
                            .send()
                            .and_then(|r| r.json::<UserInfoResponse>())
                        {
                            let _ = manager.db.set_cloud_sync_value("userEmail", info_res.email.as_deref());
                            let _ = manager.db.set_cloud_sync_value("userName", info_res.name.as_deref());
                            let _ = manager.db.set_cloud_sync_value("userPicture", info_res.picture.as_deref());
                        }

                        let html = r#"
                        <html>
                          <head><title>myNotes - Connected</title></head>
                          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f1115; color: #f8fafc; text-align: center; padding: 60px 20px;">
                            <div style="display: inline-flex; align-items: center; justify-content: center; width: 64px; height: 64px; border-radius: 50%; background: rgba(59, 130, 246, 0.15); color: #3b82f6; font-size: 32px; margin-bottom: 20px;">✓</div>
                            <h1 style="font-size: 24px; font-weight: 700; margin: 0 0 10px 0;">Google Drive Connected!</h1>
                            <p style="color: #94a3b8; font-size: 14px; max-width: 420px; margin: 0 auto 24px auto;">myNotes is now connected to your private Google Drive storage. You can safely close this tab and return to the app.</p>
                            <script>setTimeout(function() { window.close(); }, 3000);</script>
                          </body>
                        </html>"#;

                        let _ = request.respond(tiny_http::Response::from_string(html).with_header(
                            tiny_http::Header::from_bytes(&b"Content-Type"[..], &b"text/html; charset=utf-8"[..]).unwrap()
                        ));

                        let _ = app_handle.emit("cloud:sync-completed", ());
                        let manager_sync = manager.clone();
                        let app_sync = app_handle.clone();
                        tokio::spawn(async move {
                            let _ = manager_sync.sync_now(&app_sync).await;
                        });
                    }
                    Err(e) => {
                        let _ = request.respond(tiny_http::Response::from_string(format!("Token exchange failed: {}", e)).with_status_code(400));
                    }
                }
                break;
            }
        });

        Ok((
            self.db.get_cloud_sync_value("userEmail").ok().flatten().unwrap_or_default(),
            self.db.get_cloud_sync_value("userName").ok().flatten().unwrap_or_default(),
        ))
    }

    async fn get_valid_access_token(&self) -> Result<String, String> {
        let refresh_token = self
            .db
            .get_cloud_sync_value("refreshToken")
            .ok()
            .flatten()
            .ok_or("Not logged in to Google Drive")?;

        let expiry: i64 = self
            .db
            .get_cloud_sync_value("tokenExpiry")
            .ok()
            .flatten()
            .and_then(|v| v.parse().ok())
            .unwrap_or(0);

        let now = chrono::Utc::now().timestamp();
        if expiry > now + 60 {
            if let Some(tok) = self.db.get_cloud_sync_value("accessToken").ok().flatten() {
                return Ok(tok);
            }
        }

        // Refresh token
        let client = reqwest::Client::new();
        let mut params = std::collections::HashMap::new();
        let client_id = self.get_client_id();
        let client_secret = self.get_client_secret();
        params.insert("client_id", client_id);
        params.insert("client_secret", client_secret);
        params.insert("refresh_token", refresh_token);
        params.insert("grant_type", "refresh_token".to_string());

        let res = client
            .post(OAUTH_TOKEN_URL)
            .form(&params)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        let tok = res.json::<TokenResponse>().await.map_err(|e| e.to_string())?;
        self.db
            .set_cloud_sync_value("accessToken", Some(&tok.access_token))?;
        let new_expiry = chrono::Utc::now().timestamp() + (tok.expires_in.unwrap_or(3600) as i64);
        self.db
            .set_cloud_sync_value("tokenExpiry", Some(&new_expiry.to_string()))?;

        Ok(tok.access_token)
    }

    pub async fn sync_now(&self, app_handle: &AppHandle) -> Result<CloudSyncResult, String> {
        if self.is_syncing.swap(true, Ordering::SeqCst) {
            return Err("Sync already in progress".to_string());
        }

        let _ = app_handle.emit("cloud:sync-started", ());

        let result = self.execute_sync(app_handle).await;

        self.is_syncing.store(false, Ordering::SeqCst);

        match result {
            Ok(res) => {
                let now_str = chrono::Utc::now().to_rfc3339();
                let _ = self.db.set_cloud_sync_value("lastSyncTime", Some(&now_str));
                let _ = self.db.set_cloud_sync_value("lastError", None);
                let _ = app_handle.emit("cloud:sync-completed", &res);
                Ok(res)
            }
            Err(e) => {
                let _ = self.db.set_cloud_sync_value("lastError", Some(&e));
                let _ = app_handle.emit("cloud:sync-error", &e);
                Err(e)
            }
        }
    }

    async fn execute_sync(&self, app_handle: &AppHandle) -> Result<CloudSyncResult, String> {
        let access_token = self.get_valid_access_token().await?;
        let client = reqwest::Client::new();

        // 1. Search for existing vault file in appDataFolder
        let search_url = format!(
            "{}?spaces=appDataFolder&q=name+%3D+%27{}%27+and+trashed+%3D+false&fields=files(id%2Cname)",
            DRIVE_FILES_URL, VAULT_FILENAME
        );

        let search_res = client
            .get(&search_url)
            .header(AUTHORIZATION, format!("Bearer {}", access_token))
            .send()
            .await
            .map_err(|e| e.to_string())?;

        let file_list: DriveFileList = search_res.json().await.map_err(|e| e.to_string())?;
        let existing_file_id = file_list
            .files
            .and_then(|f| f.into_iter().next())
            .map(|f| f.id);

        let mut downloaded = false;

        // 2. Download remote vault if exists
        if let Some(ref fid) = existing_file_id {
            let download_url = format!("{}/{}?alt=media", DRIVE_FILES_URL, fid);
            let down_res = client
                .get(&download_url)
                .header(AUTHORIZATION, format!("Bearer {}", access_token))
                .send()
                .await
                .map_err(|e| e.to_string())?;

            if down_res.status().is_success() {
                if let Ok(remote_manifest) = down_res.json::<BackupManifest>().await {
                    let (_, changed) = self.db.merge_vault_from_cloud(remote_manifest)?;
                    downloaded = true;
                    if changed {
                        let _ = app_handle.emit("cloud:vault-updated", ());
                    }
                }
            }
        }

        // 3. Export current local manifest and upload
        let current_manifest = self.db.export_backup()?;
        let notes_count = current_manifest.notes.len();
        let manifest_bytes = serde_json::to_vec(&current_manifest).map_err(|e| e.to_string())?;

        let uploaded_file_id = if let Some(ref fid) = existing_file_id {
            // Update existing file
            let upload_url = format!("{}/{}?uploadType=media", DRIVE_UPLOAD_URL, fid);
            client
                .patch(&upload_url)
                .header(AUTHORIZATION, format!("Bearer {}", access_token))
                .header(CONTENT_TYPE, "application/json")
                .body(manifest_bytes)
                .send()
                .await
                .map_err(|e| e.to_string())?;
            fid.clone()
        } else {
            // Create new file via multipart upload
            let metadata = serde_json::json!({
                "name": VAULT_FILENAME,
                "parents": ["appDataFolder"]
            });

            let part_meta = reqwest::multipart::Part::text(metadata.to_string())
                .mime_str("application/json; charset=UTF-8")
                .map_err(|e| e.to_string())?;
            let part_media = reqwest::multipart::Part::bytes(manifest_bytes)
                .mime_str("application/json")
                .map_err(|e| e.to_string())?;

            let form = reqwest::multipart::Form::new()
                .part("metadata", part_meta)
                .part("file", part_media);

            let upload_url = format!("{}?uploadType=multipart", DRIVE_UPLOAD_URL);
            let res = client
                .post(&upload_url)
                .header(AUTHORIZATION, format!("Bearer {}", access_token))
                .multipart(form)
                .send()
                .await
                .map_err(|e| e.to_string())?;

            let new_file: DriveFileItem = res.json().await.map_err(|e| e.to_string())?;
            new_file.id
        };

        let _ = self.db.set_cloud_sync_value("fileId", Some(&uploaded_file_id));

        Ok(CloudSyncResult {
            notes_count,
            uploaded: true,
            downloaded,
            timestamp: chrono::Utc::now().to_rfc3339(),
        })
    }
}
