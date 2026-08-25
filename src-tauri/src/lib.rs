use std::path::{Path, PathBuf};
use std::sync::{atomic::{AtomicBool, Ordering}, Mutex};

#[cfg(desktop)]
use tauri::{Emitter, Manager};

#[derive(Default)]
struct PendingOpenPaths {
    paths: Mutex<Vec<String>>,
    frontend_ready: AtomicBool,
}

fn markdown_path(raw: &str, cwd: &Path) -> Option<PathBuf> {
    let candidate = Path::new(raw);
    let absolute = if candidate.is_absolute() {
        candidate.to_path_buf()
    } else {
        cwd.join(candidate)
    };
    let extension = absolute.extension()?.to_string_lossy().to_ascii_lowercase();
    if !matches!(extension.as_str(), "md" | "markdown") || !absolute.is_file() {
        return None;
    }
    Some(absolute.canonicalize().unwrap_or(absolute))
}

fn markdown_paths<I>(args: I, cwd: &Path) -> Vec<String>
where
    I: IntoIterator<Item = String>,
{
    args.into_iter()
        .filter_map(|arg| markdown_path(&arg, cwd))
        .map(|path| path.to_string_lossy().into_owned())
        .collect()
}

#[tauri::command]
fn initial_markdown_paths(state: tauri::State<'_, PendingOpenPaths>) -> Vec<String> {
    let cwd = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    let mut paths = markdown_paths(std::env::args().skip(1), &cwd);
    if let Ok(mut pending) = state.paths.lock() {
        paths.extend(pending.drain(..));
    }
    paths.sort();
    paths.dedup();
    state.frontend_ready.store(true, Ordering::Release);
    paths
}

#[tauri::command]
fn read_markdown_document(path: String) -> Result<String, String> {
    let cwd = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    let safe_path = markdown_path(&path, &cwd)
        .ok_or_else(|| "La ruta no corresponde a un documento Markdown válido.".to_string())?;
    std::fs::read_to_string(safe_path).map_err(|error| error.to_string())
}

#[cfg(desktop)]
fn deliver_markdown_paths(app: &tauri::AppHandle, paths: Vec<String>) {
    if paths.is_empty() {
        return;
    }
    let state = app.state::<PendingOpenPaths>();
    if state.frontend_ready.load(Ordering::Acquire) {
        let _ = app.emit("open-markdown-files", paths);
    } else if let Ok(mut pending) = state.paths.lock() {
        pending.extend(paths);
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    // Debe registrarse antes que el resto de plugins: si el usuario abre otro
    // Markdown con la aplicación ya en marcha, la ruta llega a la ventana
    // existente en vez de perderse en un segundo proceso.
    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, args, cwd| {
            let paths = markdown_paths(args.into_iter().skip(1), Path::new(&cwd));
            deliver_markdown_paths(app, paths);
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }));
    }

    builder
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .manage(PendingOpenPaths::default())
        .invoke_handler(tauri::generate_handler![initial_markdown_paths, read_markdown_document])
        .build(tauri::generate_context!())
        .expect("error al preparar EdiMarkWeb")
        .run(|#[allow(unused_variables)] app, #[allow(unused_variables)] event| {
            // Finder entrega los documentos asociados mediante el evento
            // nativo Opened, no como argumentos de línea de órdenes.
            #[cfg(target_os = "macos")]
            if let tauri::RunEvent::Opened { urls } = event {
                let paths = urls
                    .into_iter()
                    .filter_map(|url| url.to_file_path().ok())
                    .filter(|path| {
                        matches!(
                            path.extension()
                                .map(|ext| ext.to_string_lossy().to_ascii_lowercase()),
                            Some(ext) if matches!(ext.as_str(), "md" | "markdown")
                        )
                    })
                    .map(|path| path.to_string_lossy().into_owned())
                    .collect();
                deliver_markdown_paths(app, paths);
            }
        });
}
