use std::fs;
use std::path::Path;
use crate::types::NoteImportResult;

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

    if ["one", "onex", "onepkg"].contains(&ext.as_str()) {
        return Ok(NoteImportResult {
            import_type: None,
            notebook_title: None,
            pages: None,
            title: Some(raw_name.to_string()),
            content: None,
            format: None,
            error: Some("OneNote binary format extraction requires the python extractor in resources.".to_string()),
        });
    }

    let content = fs::read_to_string(path).map_err(|e| e.to_string())?;

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
