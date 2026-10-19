use std::collections::HashMap;
use std::env;
use std::fs;
use std::path::Path;

fn parse_env_file(path: &Path) -> HashMap<String, String> {
    let mut map = HashMap::new();
    if let Ok(content) = fs::read_to_string(path) {
        for line in content.lines() {
            let trimmed = line.trim();
            if trimmed.is_empty() || trimmed.starts_with('#') {
                continue;
            }
            let trimmed = trimmed.strip_prefix("export ").unwrap_or(trimmed).trim();
            if let Some((k, v)) = trimmed.split_once('=') {
                let key = k.trim().to_string();
                let mut val = v.trim();
                if (val.starts_with('"') && val.ends_with('"'))
                    || (val.starts_with('\'') && val.ends_with('\''))
                {
                    if val.len() >= 2 {
                        val = &val[1..val.len() - 1];
                    }
                }
                map.insert(key, val.trim().to_string());
            }
        }
    }
    map
}

fn main() {
    let manifest_dir = env::var("CARGO_MANIFEST_DIR").unwrap_or_else(|_| ".".into());
    let manifest_path = Path::new(&manifest_dir);

    // Look for .env in parent directory (workspace root) or src-tauri/.env
    let parent_env = manifest_path.parent().map(|p| p.join(".env"));
    let local_env = manifest_path.join(".env");

    let mut env_file_vars = HashMap::new();
    if let Some(ref p) = parent_env {
        if p.exists() {
            env_file_vars.extend(parse_env_file(p));
        }
    }
    if local_env.exists() {
        env_file_vars.extend(parse_env_file(&local_env));
    }

    // Only the auth relay URL is baked in; Google OAuth credentials live in the relay (worker/), never in the app
    let auth_server_url = env::var("AUTH_SERVER_URL")
        .ok()
        .or_else(|| env_file_vars.get("AUTH_SERVER_URL").cloned())
        .unwrap_or_default();
    let trimmed_auth_url = auth_server_url.trim().trim_end_matches('/');

    if !trimmed_auth_url.is_empty() {
        println!("cargo:rustc-env=BUILTIN_AUTH_SERVER_URL={}", trimmed_auth_url);
    } else if env::var("PROFILE").as_deref() == Ok("release") {
        println!("cargo:warning=AUTH_SERVER_URL is not set: Google Drive sync will be unavailable in this build");
    }

    println!("cargo:rerun-if-env-changed=AUTH_SERVER_URL");
    if let Some(ref p) = parent_env {
        println!("cargo:rerun-if-changed={}", p.display());
    }
    println!("cargo:rerun-if-changed={}", local_env.display());

    tauri_build::build()
}
