use crate::types::NoteImportResult;
use std::fs;
use std::io::Read;
use std::path::Path;

pub fn import_file_content(path_str: &str) -> Result<NoteImportResult, String> {
    let path = Path::new(path_str);
    if !path.exists() {
        return Err(format!("File does not exist: {}", path_str));
    }

    let raw_name = path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("Untitled Import");
    let ext = path
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("")
        .to_lowercase();

    if !["txt", "md", "markdown", "html", "htm"].contains(&ext.as_str()) {
        return Err(
            "Choose a Markdown, text, or HTML file. Export OneNote pages as HTML or text first."
                .to_string(),
        );
    }
    const MAX_IMPORT_BYTES: u64 = 25 * 1024 * 1024;
    let file = fs::File::open(path).map_err(|e| e.to_string())?;
    let mut content = String::new();
    file.take(MAX_IMPORT_BYTES + 1)
        .read_to_string(&mut content)
        .map_err(|e| e.to_string())?;
    if content.len() as u64 > MAX_IMPORT_BYTES {
        return Err("File is too large. Choose a file smaller than 25 MB.".to_string());
    }

    Ok(NoteImportResult {
        import_type: Some("single".to_string()),
        notebook_title: None,
        pages: None,
        title: Some(raw_name.to_string()),
        content: Some(content),
        format: Some("markdown".to_string()),
        error: None,
    })
}
