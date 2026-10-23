use crate::db::Database;
use crate::types::{BackupManifest, CloudSyncConfig, CloudSyncResult};
use base64::engine::general_purpose::URL_SAFE_NO_PAD as BASE64_URL;
use base64::Engine;
use rand::RngCore;
use reqwest::header::{AUTHORIZATION, CONTENT_TYPE};
use serde::Deserialize;
use sha2::{Digest, Sha256};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter};
use tauri_plugin_opener::OpenerExt;

const DRIVE_FILES_URL: &str = "https://www.googleapis.com/drive/v3/files";
const DRIVE_UPLOAD_URL: &str = "https://www.googleapis.com/upload/drive/v3/files";
const VAULT_FILENAME: &str = "mynotes_vault.json";
const GOOGLE_REVOKE_URL: &str = "https://oauth2.googleapis.com/revoke";

pub struct CloudSyncManager {
    db: Arc<Database>,
    is_syncing: AtomicBool,
    pending_sync: Mutex<bool>,
}

#[derive(Deserialize)]
struct DriveFileList {
    files: Option<Vec<DriveFileItem>>,
}

#[derive(Deserialize)]
struct DriveFileItem {
    id: String,
}

/// Auth relay (worker/) baked in at build time from AUTH_SERVER_URL. The Google client
/// ID/secret live only in the relay, never in the app.
const COMPILE_TIME_AUTH_SERVER_URL: Option<&str> = option_env!("BUILTIN_AUTH_SERVER_URL");

/// Dev builds only: read a value from the process env or a nearby .env file
#[cfg(debug_assertions)]
fn dev_env_value(key: &str) -> Option<String> {
    if let Ok(v) = std::env::var(key) {
        let trimmed = v.trim().to_string();
        if !trimmed.is_empty() {
            return Some(trimmed);
        }
    }

    let cwd = std::env::current_dir().ok()?;
    let candidates = [
        cwd.join(".env"),
        cwd.join("..").join(".env"),
        cwd.join("src-tauri").join(".env"),
    ];
    for path in &candidates {
        let Ok(contents) = std::fs::read_to_string(path) else {
            continue;
        };
        for line in contents.lines() {
            let trimmed = line.trim();
            if trimmed.is_empty() || trimmed.starts_with('#') {
                continue;
            }
            let trimmed = trimmed.strip_prefix("export ").unwrap_or(trimmed).trim();
            if let Some((k, v)) = trimmed.split_once('=') {
                if k.trim() == key {
                    let val = v.trim().trim_matches('"').trim_matches('\'').trim();
                    if !val.is_empty() {
                        return Some(val.to_string());
                    }
                }
            }
        }
    }
    None
}

struct LoginTokens {
    access_token: String,
    refresh_token: Option<String>,
    expires_in: Option<u64>,
    email: Option<String>,
    name: Option<String>,
    picture: Option<String>,
}

const TOKEN_KEYS: [&str; 7] = [
    "accessToken",
    "refreshToken",
    "tokenExpiry",
    "tokenIssuer",
    "userEmail",
    "userName",
    "userPicture",
];

/// Settings from older versions that let users enter their own OAuth credentials
const LEGACY_CREDENTIAL_KEYS: [&str; 3] = ["clientId", "clientSecret", "authServerUrl"];

fn escape_html(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#39;")
}

fn exchange_code_via_relay(
    client: &reqwest::blocking::Client,
    auth_server_url: &str,
    code: &str,
    code_verifier: &str,
) -> Result<LoginTokens, String> {
    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct RelayTokenResponse {
        success: bool,
        access_token: Option<String>,
        refresh_token: Option<String>,
        expires_in: Option<u64>,
        email: Option<String>,
        name: Option<String>,
        picture: Option<String>,
        error: Option<String>,
    }

    let res = client
        .post(format!("{}/auth/token", auth_server_url))
        .json(&serde_json::json!({ "code": code, "codeVerifier": code_verifier }))
        .send()
        .map_err(|e| format!("Auth relay request failed: {}", e))?
        .json::<RelayTokenResponse>()
        .map_err(|e| format!("Failed to parse auth relay response: {}", e))?;

    match res.access_token {
        Some(access_token) if res.success => Ok(LoginTokens {
            access_token,
            refresh_token: res.refresh_token,
            expires_in: res.expires_in,
            email: res.email,
            name: res.name,
            picture: res.picture,
        }),
        _ => Err(res
            .error
            .unwrap_or_else(|| "Token exchange failed on auth relay".to_string())),
    }
}

async fn handle_drive_response(
    res: reqwest::Response,
    action: &str,
) -> Result<reqwest::Response, String> {
    let status = res.status();
    if status.is_success() {
        return Ok(res);
    }

    let body = res.text().await.unwrap_or_default();
    if let Ok(val) = serde_json::from_str::<serde_json::Value>(&body) {
        if let Some(msg) = val
            .get("error")
            .and_then(|e| e.get("message"))
            .and_then(|m| m.as_str())
        {
            return Err(format!("{}: {}", action, msg));
        }
    }
    if body.trim().is_empty() {
        Err(format!("{} (HTTP {})", action, status))
    } else {
        Err(format!("{} (HTTP {}): {}", action, status, body))
    }
}

impl CloudSyncManager {
    pub fn new(db: Arc<Database>) -> Self {
        // Older versions could store user-entered OAuth credentials (including a client secret) in plaintext
        for key in LEGACY_CREDENTIAL_KEYS {
            let _ = db.set_cloud_sync_value(key, None);
        }
        Self {
            db,
            is_syncing: AtomicBool::new(false),
            pending_sync: Mutex::new(false),
        }
    }

    pub fn get_auth_server_url(&self) -> String {
        #[cfg(debug_assertions)]
        if let Some(url) = dev_env_value("AUTH_SERVER_URL") {
            return url.trim_end_matches('/').to_string();
        }

        COMPILE_TIME_AUTH_SERVER_URL
            .map(|url| url.trim().trim_end_matches('/').to_string())
            .unwrap_or_default()
    }

    /// Identifies who issued the stored tokens; refresh tokens are only ever sent back to their issuer
    fn token_issuer(&self) -> String {
        format!("relay:{}", self.get_auth_server_url())
    }

    fn clear_tokens(&self) -> Result<(), String> {
        for key in TOKEN_KEYS {
            self.db.set_cloud_sync_value(key, None)?;
        }
        Ok(())
    }

    pub fn is_connected(&self) -> bool {
        self.db
            .get_cloud_sync_value("refreshToken")
            .ok()
            .flatten()
            .is_some()
    }

    pub fn is_ready(&self) -> bool {
        !self.get_auth_server_url().is_empty()
    }

    pub fn get_config(&self) -> CloudSyncConfig {
        let auto_sync_val = self.db.get_cloud_sync_value("autoSync").ok().flatten();

        CloudSyncConfig {
            user_email: self.db.get_cloud_sync_value("userEmail").ok().flatten(),
            user_name: self.db.get_cloud_sync_value("userName").ok().flatten(),
            user_picture: self.db.get_cloud_sync_value("userPicture").ok().flatten(),
            auto_sync: auto_sync_val.as_deref() != Some("0"),
            last_sync_time: self.db.get_cloud_sync_value("lastSyncTime").ok().flatten(),
            is_connected: self.is_connected(),
            is_syncing: self.is_syncing.load(Ordering::SeqCst),
            last_error: self.db.get_cloud_sync_value("lastError").ok().flatten(),
            file_id: self.db.get_cloud_sync_value("fileId").ok().flatten(),
            is_ready: self.is_ready(),
        }
    }

    pub fn set_auto_sync(&self, enabled: bool) -> Result<(), String> {
        self.db
            .set_cloud_sync_value("autoSync", Some(if enabled { "1" } else { "0" }))
    }

    pub async fn logout(&self) -> Result<(), String> {
        let refresh_token = self.db.get_cloud_sync_value("refreshToken").ok().flatten();
        // Clear local state first so Disconnect always works, even offline
        self.db.clear_cloud_sync()?;

        // Best effort: revoke the grant at Google too (revoking the refresh token revokes its access tokens)
        if let Some(token) = refresh_token {
            let _ = reqwest::Client::new()
                .post(GOOGLE_REVOKE_URL)
                .timeout(std::time::Duration::from_secs(10))
                .form(&[("token", token)])
                .send()
                .await;
        }
        Ok(())
    }

    pub async fn start_login(
        self: Arc<Self>,
        app_handle: AppHandle,
    ) -> Result<(String, String), String> {
        let auth_server_url = self.get_auth_server_url();
        if auth_server_url.is_empty() {
            return Err("Google Drive sync isn't available in this build of MyNotes.".to_string());
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

        let auth_url = format!(
            "{}/auth/login?port={}&state={}&code_challenge={}",
            auth_server_url,
            port,
            urlencoding::encode(&state),
            urlencoding::encode(&code_challenge)
        );

        // Open user default browser
        let _ = app_handle.opener().open_url(&auth_url, None::<&str>);

        let manager = self.clone();
        let issuer = self.token_issuer();

        tokio::task::spawn_blocking(move || {
            let html_header = || {
                tiny_http::Header::from_bytes(
                    &b"Content-Type"[..],
                    &b"text/html; charset=utf-8"[..],
                )
                .unwrap()
            };

            let report_error = |msg: &str| {
                let _ = manager.db.set_cloud_sync_value("lastError", Some(msg));
                let _ = app_handle.emit("cloud:sync-error", msg);
            };

            // Give up after a while so abandoned sign-ins don't leave a listener and port open forever
            let deadline = std::time::Instant::now() + std::time::Duration::from_secs(300);
            loop {
                let remaining = deadline.saturating_duration_since(std::time::Instant::now());
                if remaining.is_zero() {
                    report_error("Google sign-in timed out. Please try again.");
                    break;
                }
                let request = match server.recv_timeout(remaining) {
                    Ok(Some(r)) => r,
                    Ok(None) => continue,
                    Err(_) => break,
                };

                let url = request.url().to_string();
                if !url.starts_with("/callback") {
                    let _ = request.respond(
                        tiny_http::Response::from_string("Not found").with_status_code(404),
                    );
                    continue;
                }

                let parsed_url = format!("http://127.0.0.1{}", url);
                let url_obj = match url::Url::parse(&parsed_url) {
                    Ok(u) => u,
                    Err(_) => {
                        let _ = request.respond(
                            tiny_http::Response::from_string("Bad Request").with_status_code(400),
                        );
                        continue;
                    }
                };

                let query_pairs: std::collections::HashMap<_, _> =
                    url_obj.query_pairs().into_owned().collect();
                let ret_state = query_pairs.get("state");
                let error_param = query_pairs.get("error");
                let code = query_pairs.get("code");

                // Ignore anything that doesn't carry our CSRF state so stray requests can't cancel or hijack the login
                if ret_state != Some(&state) {
                    let _ = request.respond(
                        tiny_http::Response::from_string("Invalid state").with_status_code(400),
                    );
                    continue;
                }

                if let Some(err) = error_param {
                    let html = format!(
                        r#"<html><body style="font-family:-apple-system,sans-serif;background:#0f1115;color:#f87171;text-align:center;padding:60px 20px;">
                        <h2>Authentication Cancelled</h2><p>{}</p></body></html>"#,
                        escape_html(err)
                    );
                    let _ = request
                        .respond(tiny_http::Response::from_string(html).with_header(html_header()));
                    report_error(&format!("Google sign-in failed: {}", err));
                    break;
                }

                let Some(code_val) = code else {
                    let _ = request.respond(
                        tiny_http::Response::from_string("Invalid request").with_status_code(400),
                    );
                    break;
                };

                let client = reqwest::blocking::Client::new();
                // Redeem the PKCE-bound code at the relay, which holds the client secret
                let login_result =
                    exchange_code_via_relay(&client, &auth_server_url, code_val, &code_verifier);

                match login_result {
                    Ok(login) => {
                        let _ = manager
                            .db
                            .set_cloud_sync_value("accessToken", Some(&login.access_token));
                        if let Some(ref rt) = login.refresh_token {
                            if !rt.is_empty() {
                                let _ = manager.db.set_cloud_sync_value("refreshToken", Some(rt));
                            }
                        }
                        let expiry = chrono::Utc::now().timestamp()
                            + (login.expires_in.unwrap_or(3600) as i64);
                        let _ = manager
                            .db
                            .set_cloud_sync_value("tokenExpiry", Some(&expiry.to_string()));
                        let _ = manager
                            .db
                            .set_cloud_sync_value("tokenIssuer", Some(&issuer));
                        let _ = manager
                            .db
                            .set_cloud_sync_value("userEmail", login.email.as_deref());
                        let _ = manager
                            .db
                            .set_cloud_sync_value("userName", login.name.as_deref());
                        let _ = manager
                            .db
                            .set_cloud_sync_value("userPicture", login.picture.as_deref());

                        let html = r#"
                        <html>
                          <head><title>MyNotes - Connected</title></head>
                          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f1115; color: #f8fafc; text-align: center; padding: 60px 20px;">
                            <div style="display: inline-flex; align-items: center; justify-content: center; width: 64px; height: 64px; border-radius: 50%; background: rgba(59, 130, 246, 0.15); color: #3b82f6; font-size: 32px; margin-bottom: 20px;">✓</div>
                            <h1 style="font-size: 24px; font-weight: 700; margin: 0 0 10px 0;">Google Drive Connected!</h1>
                            <p style="color: #94a3b8; font-size: 14px; max-width: 420px; margin: 0 auto 24px auto;">MyNotes is now connected to your private Google Drive storage. You can safely close this tab and return to the app.</p>
                            <script>setTimeout(function() { window.close(); }, 3000);</script>
                          </body>
                        </html>"#;

                        let _ = request.respond(
                            tiny_http::Response::from_string(html).with_header(html_header()),
                        );

                        let _ = app_handle.emit("cloud:sync-completed", ());
                        let manager_sync = manager.clone();
                        let app_sync = app_handle.clone();
                        tokio::spawn(async move {
                            let _ = manager_sync.sync_now(&app_sync).await;
                        });
                    }
                    Err(e) => {
                        let _ = request.respond(
                            tiny_http::Response::from_string(format!(
                                "Token exchange failed: {}",
                                e
                            ))
                            .with_status_code(400),
                        );
                        report_error(&format!("Google sign-in failed: {}", e));
                    }
                }
                break;
            }
        });

        Ok((
            self.db
                .get_cloud_sync_value("userEmail")
                .ok()
                .flatten()
                .unwrap_or_default(),
            self.db
                .get_cloud_sync_value("userName")
                .ok()
                .flatten()
                .unwrap_or_default(),
        ))
    }

    async fn get_valid_access_token(&self) -> Result<String, String> {
        let refresh_token = self
            .db
            .get_cloud_sync_value("refreshToken")
            .ok()
            .flatten()
            .ok_or("Not logged in to Google Drive")?;

        // Never send a refresh token to anyone but the relay/client that issued it
        if self.db.get_cloud_sync_value("tokenIssuer").ok().flatten() != Some(self.token_issuer()) {
            self.clear_tokens()?;
            return Err("Google Drive sign-in settings changed. Please sign in again.".to_string());
        }

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

        let auth_server_url = self.get_auth_server_url();
        if auth_server_url.is_empty() {
            return Err("Google Drive sync isn't available in this build of MyNotes.".to_string());
        }

        #[derive(Deserialize)]
        #[serde(rename_all = "camelCase")]
        struct RelayRefreshResponse {
            success: bool,
            access_token: Option<String>,
            expires_in: Option<u64>,
            error: Option<String>,
        }

        let refresh_res = reqwest::Client::new()
            .post(format!("{}/auth/refresh", auth_server_url))
            .json(&serde_json::json!({ "refreshToken": refresh_token }))
            .send()
            .await
            .map_err(|e| format!("Auth relay refresh failed: {}", e))?
            .json::<RelayRefreshResponse>()
            .await
            .map_err(|e| format!("Failed to parse auth relay response: {}", e))?;

        let new_tok = match refresh_res.access_token {
            Some(tok) if refresh_res.success => tok,
            _ => {
                // Google revoked the grant (user removed access, or the refresh token expired)
                if refresh_res.error.as_deref() == Some("invalid_grant") {
                    self.clear_tokens()?;
                    return Err(
                        "Google Drive access expired or was revoked. Please sign in again."
                            .to_string(),
                    );
                }
                return Err(refresh_res
                    .error
                    .unwrap_or_else(|| "Token refresh failed on auth relay".to_string()));
            }
        };

        self.db
            .set_cloud_sync_value("accessToken", Some(&new_tok))?;
        let new_expiry =
            chrono::Utc::now().timestamp() + (refresh_res.expires_in.unwrap_or(3600) as i64);
        self.db
            .set_cloud_sync_value("tokenExpiry", Some(&new_expiry.to_string()))?;

        Ok(new_tok)
    }

    pub async fn sync_now(&self, app_handle: &AppHandle) -> Result<CloudSyncResult, String> {
        {
            let mut pending = self.pending_sync.lock().map_err(|e| e.to_string())?;
            if self.is_syncing.swap(true, Ordering::SeqCst) {
                *pending = true;
                return Err("Sync already in progress; another sync has been queued".to_string());
            }
        }

        let _ = app_handle.emit("cloud:sync-started", ());

        let result = loop {
            let result = self.execute_sync(app_handle).await;
            let mut pending = self.pending_sync.lock().map_err(|e| e.to_string())?;
            // A delete during upload needs a second pass to reach Drive.
            if result.is_ok() && *pending {
                *pending = false;
                continue;
            }
            *pending = false;
            self.is_syncing.store(false, Ordering::SeqCst);
            break result;
        };

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
            .map_err(|e| format!("Drive search network error: {}", e))?;
        let search_res = handle_drive_response(search_res, "Drive search failed").await?;

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
                .map_err(|e| format!("Drive download network error: {}", e))?;
            let down_res = handle_drive_response(down_res, "Drive download failed").await?;

            // Abort rather than upload over a remote vault we couldn't read: that would drop other devices' edits
            let remote_manifest = down_res
                .json::<BackupManifest>()
                .await
                .map_err(|e| format!("Could not read the cloud vault, sync aborted: {}", e))?;
            let (_, changed) = self.db.merge_vault_from_cloud(remote_manifest)?;
            downloaded = true;
            if changed {
                let _ = app_handle.emit("cloud:vault-updated", ());
            }
        }

        // 3. Export current local manifest and upload
        let current_manifest = self.db.export_backup()?;
        let notes_count = current_manifest.notes.len();
        let manifest_bytes = serde_json::to_vec(&current_manifest).map_err(|e| e.to_string())?;

        let uploaded_file_id = if let Some(ref fid) = existing_file_id {
            // Update existing file
            let upload_url = format!("{}/{}?uploadType=media", DRIVE_UPLOAD_URL, fid);
            let res = client
                .patch(&upload_url)
                .header(AUTHORIZATION, format!("Bearer {}", access_token))
                .header(CONTENT_TYPE, "application/json")
                .body(manifest_bytes)
                .send()
                .await
                .map_err(|e| format!("Drive upload network error: {}", e))?;
            let _ = handle_drive_response(res, "Drive upload failed").await?;
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
                .map_err(|e| format!("Drive upload network error: {}", e))?;
            let res = handle_drive_response(res, "Drive upload failed").await?;

            let new_file: DriveFileItem = res.json().await.map_err(|e| e.to_string())?;
            new_file.id
        };

        let _ = self
            .db
            .set_cloud_sync_value("fileId", Some(&uploaded_file_id));

        Ok(CloudSyncResult {
            notes_count,
            uploaded: true,
            downloaded,
            timestamp: chrono::Utc::now().to_rfc3339(),
        })
    }
}
