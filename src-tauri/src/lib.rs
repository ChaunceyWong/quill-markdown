use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::Manager;

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct Entry {
    path: String,
    name: String,
    is_dir: bool,
    children: Option<Vec<Entry>>,
}

fn list_entries(dir: &Path) -> std::io::Result<Vec<Entry>> {
    let mut entries = Vec::new();
    let mut items: Vec<_> = fs::read_dir(dir)?.filter_map(|e| e.ok()).collect();
    items.sort_by_key(|e| {
        let is_dir = e.file_type().map(|t| t.is_dir()).unwrap_or(false);
        (!is_dir, e.file_name())
    });
    for e in items {
        let name = e.file_name().to_string_lossy().into_owned();
        if name.starts_with('.') {
            continue;
        }
        let is_dir = e.file_type().map(|t| t.is_dir()).unwrap_or(false);
        let path = e.path();
        let children = if is_dir { Some(list_entries(&path)?) } else { None };
        entries.push(Entry {
            path: path.to_string_lossy().into_owned(),
            name,
            is_dir,
            children,
        });
    }
    Ok(entries)
}

#[tauri::command]
fn read_folder(path: &str) -> Result<Vec<Entry>, String> {
    let root = Path::new(path);
    if !root.is_dir() {
        return Err("Not a directory".into());
    }
    list_entries(root).map_err(|e| e.to_string())
}

#[tauri::command]
fn read_file(path: &str) -> Result<String, String> {
    fs::read_to_string(path).map_err(|e| e.to_string())
}

/// Recursively collect all .md files under a directory (skipping hidden dirs
/// and `_assets`). Used by the backlink index.
#[tauri::command]
fn list_markdown_files(root: &str) -> Result<Vec<String>, String> {
    fn walk(dir: &Path, out: &mut Vec<String>) -> std::io::Result<()> {
        for e in fs::read_dir(dir)?.filter_map(|e| e.ok()) {
            let name = e.file_name().to_string_lossy().into_owned();
            if name.starts_with('.') || name == "_assets" {
                continue;
            }
            let p = e.path();
            if p.is_dir() {
                walk(&p, out)?;
            } else if p.extension().and_then(|s| s.to_str()) == Some("md") {
                out.push(p.to_string_lossy().into_owned());
            }
        }
        Ok(())
    }
    let mut out = Vec::new();
    walk(Path::new(root), &mut out).map_err(|e| e.to_string())?;
    Ok(out)
}

/// Read an image asset and return it as a data URL for the preview.
/// Using data URLs avoids depending on Tauri's `asset://` protocol scope
/// and works identically in the Tauri webview and a plain browser.
#[tauri::command]
fn read_asset(path: &str) -> Result<String, String> {
    use base64::Engine;
    let p = Path::new(path);
    let bytes = fs::read(p).map_err(|e| e.to_string())?;
    let mime = match p.extension().and_then(|s| s.to_str()).unwrap_or("") {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "svg" => "image/svg+xml",
        _ => "application/octet-stream",
    };
    let b64 = base64::engine::general_purpose::STANDARD.encode(bytes);
    Ok(format!("data:{};base64,{}", mime, b64))
}

#[tauri::command]
fn write_file(path: &str, content: &str) -> Result<(), String> {
    let target = PathBuf::from(path);
    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let tmp = target.with_extension(format!(
        "{}.{}.tmp",
        target.extension().and_then(|s| s.to_str()).unwrap_or("md"),
        std::process::id()
    ));
    fs::write(&tmp, content).map_err(|e| e.to_string())?;
    fs::rename(&tmp, &target).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn write_temp_image(app: tauri::AppHandle, data_url: &str) -> Result<String, String> {
    use base64::Engine;
    let (mime, b64) = data_url
        .strip_prefix("data:")
        .and_then(|s| s.split_once(','))
        .ok_or("Invalid data URL")?;
    let ext = match mime {
        "image/png" => "png",
        "image/jpeg" => "jpg",
        "image/gif" => "gif",
        "image/webp" => "webp",
        _ => "png",
    };
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(b64)
        .map_err(|e| e.to_string())?;
    let dir = app.path().temp_dir().map_err(|e| e.to_string())?;
    let path = dir.join(format!("quill-paste-{}-{}.{}", std::process::id(), timestamp_nanos(), ext));
    fs::write(&path, bytes).map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().into_owned())
}

#[tauri::command]
fn save_image(source_path: &str, doc_path: &str) -> Result<String, String> {
    let doc = Path::new(doc_path);
    let parent = doc.parent().ok_or("No parent directory")?;
    let assets = parent.join("_assets");
    fs::create_dir_all(&assets).map_err(|e| e.to_string())?;
    let src = Path::new(source_path);
    let ext = src
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("png")
        .to_string();
    let name = format!("img-{}.{}", timestamp_nanos(), ext);
    let dest = assets.join(&name);
    fs::copy(src, &dest).map_err(|e| e.to_string())?;
    Ok(format!("_assets/{}", name))
}

fn timestamp_nanos() -> u128 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos()
}

fn config_path(app: &tauri::AppHandle, name: &str) -> Result<PathBuf, String> {
    let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join(name))
}

#[tauri::command]
fn load_state(app: tauri::AppHandle) -> Result<serde_json::Value, String> {
    let path = config_path(&app, "state.json")?;
    if !path.exists() {
        return Ok(serde_json::json!({ "recent": [], "theme": "light", "folder": null }));
    }
    let s = fs::read_to_string(path).map_err(|e| e.to_string())?;
    serde_json::from_str(&s).map_err(|e| e.to_string())
}

/// Set the native window appearance so macOS overlay scrollbars and other
/// native controls follow the chosen theme (CSS alone cannot recolor them).
// ---- File management ----------------------------------------------------

#[tauri::command]
fn create_entry(path: &str, is_dir: bool) -> Result<(), String> {
    let p = Path::new(path);
    if p.exists() { return Err("Already exists".into()); }
    if is_dir { fs::create_dir_all(p) } else { fs::write(p, "") }
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn rename_entry(from: &str, to: &str) -> Result<(), String> {
    let src = Path::new(from);
    let dst = Path::new(to);
    if !src.exists() { return Err("Source not found".into()); }
    if dst.exists() { return Err("Target already exists".into()); }
    fs::rename(src, dst).map_err(|e| e.to_string())
}

fn copy_dir_recursive(src: &Path, dst: &Path) -> std::io::Result<()> {
    fs::create_dir_all(dst)?;
    for e in fs::read_dir(src)? {
        let e = e?;
        let name = e.file_name();
        let target = dst.join(&name);
        if e.file_type()?.is_dir() {
            copy_dir_recursive(&e.path(), &target)?;
        } else {
            fs::copy(e.path(), target)?;
        }
    }
    Ok(())
}

#[tauri::command]
fn copy_entry(from: &str, to: &str, cut: bool) -> Result<(), String> {
    let src = Path::new(from);
    let dst = Path::new(to);
    if !src.exists() { return Err("Source not found".into()); }
    if dst.exists() { return Err("Target already exists".into()); }
    let result = if cut {
        fs::rename(src, dst)
    } else if src.is_dir() {
        copy_dir_recursive(src, dst)
    } else {
        fs::copy(src, dst).map(|_| ())
    };
    result.map_err(|e| e.to_string())
}

#[tauri::command]
fn trash_entry(path: &str) -> Result<(), String> {
    trash::delete(path).map_err(|e| e.to_string())
}

#[tauri::command]
fn reveal_in_finder(path: &str) -> Result<(), String> {
    std::process::Command::new("open")
        .arg("-R").arg(path)
        .spawn().map(|_| ()).map_err(|e| e.to_string())
}

#[tauri::command]
fn open_with_default_app(path: &str) -> Result<(), String> {
    std::process::Command::new("open")
        .arg(path)
        .spawn().map(|_| ()).map_err(|e| e.to_string())
}

#[tauri::command]
fn set_window_theme(window: tauri::WebviewWindow, dark: bool) -> Result<(), String> {
    use tauri::Theme;
    window.set_theme(Some(if dark { Theme::Dark } else { Theme::Light })).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn save_state(app: tauri::AppHandle, state: serde_json::Value) -> Result<(), String> {
    let path = config_path(&app, "state.json")?;
    let s = serde_json::to_string_pretty(&state).map_err(|e| e.to_string())?;
    fs::write(path, s).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            read_folder,
            read_file,
            list_markdown_files,
            read_asset,
            write_file,
            write_temp_image,
            save_image,
            load_state,
            save_state,
            create_entry,
            rename_entry,
            copy_entry,
            trash_entry,
            reveal_in_finder,
            open_with_default_app,
            set_window_theme
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
