use std::collections::HashSet;
use std::sync::{Arc, Mutex};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StreamEvent {
    #[serde(rename = "type")]
    pub event_type: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub text: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub accumulated: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[derive(Default)]
pub struct AiStreamManager {
    canceled_streams: Mutex<HashSet<String>>,
}

impl AiStreamManager {
    pub fn cancel(&self, stream_id: &str) {
        if let Ok(mut set) = self.canceled_streams.lock() {
            set.insert(stream_id.to_string());
        }
    }

    pub fn is_canceled(&self, stream_id: &str) -> bool {
        self.canceled_streams
            .lock()
            .map(|s| s.contains(stream_id))
            .unwrap_or(false)
    }

    pub fn cleanup(&self, stream_id: &str) {
        if let Ok(mut set) = self.canceled_streams.lock() {
            set.remove(stream_id);
        }
    }

    pub async fn stream_completion(
        self: Arc<Self>,
        app_handle: AppHandle,
        stream_id: String,
        messages: Vec<serde_json::Value>,
    ) {
        let channel = format!("ai:stream:{}", stream_id);

        let _ = app_handle.emit(
            &channel,
            StreamEvent {
                event_type: "start".to_string(),
                text: None,
                accumulated: None,
                error: None,
            },
        );

        let last_message = messages
            .last()
            .and_then(|m| m.get("content"))
            .and_then(|c| c.as_str())
            .unwrap_or("");

        let text_to_refine = if let Some(idx) = last_message.find("Here is the content:") {
            &last_message[idx + 20..]
        } else {
            last_message
        };

        let refined_text = if text_to_refine.trim().is_empty() {
            "Improved note text.".to_string()
        } else {
            text_to_refine
                .lines()
                .map(|l| l.trim())
                .filter(|l| !l.is_empty())
                .collect::<Vec<_>>()
                .join("\n\n")
        };

        let words: Vec<&str> = refined_text.split_whitespace().collect();
        let mut current = String::new();

        for word in words {
            if self.is_canceled(&stream_id) {
                let _ = app_handle.emit(
                    &channel,
                    StreamEvent {
                        event_type: "canceled".to_string(),
                        text: None,
                        accumulated: None,
                        error: None,
                    },
                );
                self.cleanup(&stream_id);
                return;
            }

            if !current.is_empty() {
                current.push(' ');
            }
            current.push_str(word);

            let _ = app_handle.emit(
                &channel,
                StreamEvent {
                    event_type: "chunk".to_string(),
                    text: Some(format!(" {}", word)),
                    accumulated: Some(current.clone()),
                    error: None,
                },
            );

            tokio::time::sleep(tokio::time::Duration::from_millis(25)).await;
        }

        let _ = app_handle.emit(
            &channel,
            StreamEvent {
                event_type: "done".to_string(),
                text: Some(current),
                accumulated: None,
                error: None,
            },
        );

        self.cleanup(&stream_id);
    }
}
