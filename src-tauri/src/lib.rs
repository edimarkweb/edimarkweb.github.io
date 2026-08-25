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

/// Sistema y arquitectura del binario en marcha, para elegir el instalador
/// adecuado entre los adjuntos de la publicación de GitHub.
#[tauri::command]
fn update_target() -> String {
    format!("{}/{}", std::env::consts::OS, std::env::consts::ARCH)
}

const INSTALLER_EXTENSIONS: [&str; 5] = ["deb", "appimage", "msi", "exe", "dmg"];

fn safe_installer_name(file_name: &str) -> Option<String> {
    // Solo el nombre: un adjunto malicioso no debe poder escribir fuera de la
    // carpeta de descargas mediante `../` ni rutas absolutas.
    let name = Path::new(file_name).file_name()?.to_string_lossy().into_owned();
    if name.is_empty() || name.starts_with('.') {
        return None;
    }
    if !name
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || matches!(c, '.' | '_' | '-' | '+' | '~'))
    {
        return None;
    }
    let extension = Path::new(&name).extension()?.to_string_lossy().to_ascii_lowercase();
    if !INSTALLER_EXTENSIONS.contains(&extension.as_str()) {
        return None;
    }
    Some(name)
}

/// Guarda el instalador ya descargado por la interfaz y lo entrega al sistema:
/// los paquetes se abren con el instalador nativo y las AppImage, que no se
/// instalan, se muestran en su carpeta para que el usuario sustituya la suya.
#[tauri::command]
fn install_downloaded_update(
    app: tauri::AppHandle,
    request: tauri::ipc::Request<'_>,
) -> Result<String, String> {
    use tauri::Manager;
    use tauri_plugin_opener::OpenerExt;

    // El instalador viaja como cuerpo binario del IPC: un paquete de decenas de
    // megabytes serializado a JSON tardaría minutos y multiplicaría la memoria.
    let file_name = request
        .headers()
        .get("x-installer-name")
        .and_then(|value| value.to_str().ok())
        .ok_or_else(|| "Falta el nombre del instalador.".to_string())?;
    let bytes = match request.body() {
        tauri::ipc::InvokeBody::Raw(bytes) => bytes,
        _ => return Err("El instalador debe enviarse en binario.".to_string()),
    };

    let name = safe_installer_name(file_name)
        .ok_or_else(|| "El nombre del instalador no es válido.".to_string())?;
    let extension = Path::new(&name)
        .extension()
        .map(|ext| ext.to_string_lossy().to_ascii_lowercase())
        .unwrap_or_default();

    let directory = app
        .path()
        .download_dir()
        .ok()
        .filter(|dir| dir.is_dir())
        .unwrap_or_else(std::env::temp_dir)
        .join("EdiMarkWeb");
    std::fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
    let destination = directory.join(&name);
    std::fs::write(&destination, bytes).map_err(|error| error.to_string())?;

    #[cfg(unix)]
    if extension == "appimage" {
        use std::os::unix::fs::PermissionsExt;
        std::fs::set_permissions(&destination, std::fs::Permissions::from_mode(0o755))
            .map_err(|error| error.to_string())?;
    }

    let opener = app.opener();
    let handed_over = if extension == "appimage" {
        opener.reveal_item_in_dir(&destination)
    } else {
        opener.open_path(destination.to_string_lossy().into_owned(), None::<&str>)
    };
    if let Err(error) = handed_over {
        // El archivo está guardado aunque el escritorio no sepa abrirlo: se
        // devuelve la ruta para que la interfaz pueda indicarla.
        let _ = opener.reveal_item_in_dir(&destination);
        eprintln!("No se pudo abrir el instalador descargado: {error}");
    }

    Ok(destination.to_string_lossy().into_owned())
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
        // La descarga del instalador la hace Rust: GitHub redirige los
        // adjuntos a un servidor sin cabeceras CORS y el webview los rechaza.
        .plugin(tauri_plugin_http::init())
        .manage(PendingOpenPaths::default())
        .invoke_handler(tauri::generate_handler![
            initial_markdown_paths,
            read_markdown_document,
            update_target,
            install_downloaded_update
        ])
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
