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

const IMAGE_EXTENSIONS: [&str; 9] = [
    "png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "avif", "ico",
];

/// Un `.md` corriente no lleva las imágenes dentro, sino que las referencia con
/// rutas relativas a su carpeta. La vista previa las pide por aquí, ya
/// resueltas contra la ruta del documento abierto.
///
/// Solo se sirven imágenes: la interfaz no debe poder leer un archivo
/// cualquiera del disco por el hecho de nombrarlo en un `![](…)`.
#[tauri::command]
fn read_document_asset(path: String) -> Result<tauri::ipc::Response, String> {
    // En binario, como el instalador: una imagen serializada a JSON multiplica
    // su tamaño y bloquea el webview mientras se descodifica.
    document_asset_bytes(&path).map(tauri::ipc::Response::new)
}

fn document_asset_bytes(path: &str) -> Result<Vec<u8>, String> {
    // 64 MB: una foto de móvil cabe de sobra y un vídeo o un disco de máquina
    // virtual, que no pintan nada en una vista previa, no se cargan en memoria.
    const MAX_BYTES: u64 = 64 * 1024 * 1024;

    let candidate = Path::new(path);
    if !candidate.is_absolute() {
        return Err("La ruta de la imagen debe ser absoluta.".to_string());
    }
    let extension = candidate
        .extension()
        .map(|ext| ext.to_string_lossy().to_ascii_lowercase())
        .unwrap_or_default();
    if !IMAGE_EXTENSIONS.contains(&extension.as_str()) {
        return Err("Solo se pueden abrir imágenes.".to_string());
    }
    let metadata = std::fs::metadata(candidate).map_err(|error| error.to_string())?;
    if !metadata.is_file() {
        return Err("La ruta no corresponde a un archivo.".to_string());
    }
    if metadata.len() > MAX_BYTES {
        return Err("La imagen es demasiado grande para la vista previa.".to_string());
    }

    std::fs::read(candidate).map_err(|error| error.to_string())
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

/*
  WebKitGTK trae el corrector ortográfico apagado, así que en Linux hay que
  encenderlo a mano y decirle en qué idioma se escribe; usa los diccionarios
  hunspell del sistema (en Debian, paquetes como `hunspell-es`). En Windows y
  macOS el webview del sistema ya corrige por su cuenta.
*/
#[cfg(target_os = "linux")]
fn apply_spell_checking(window: &tauri::WebviewWindow, enabled: bool, candidates: Vec<String>) {
    let _ = window.with_webview(move |webview| {
        use webkit2gtk::{WebContextExt, WebViewExt};
        let Some(context) = webview.inner().context() else {
            return;
        };
        context.set_spell_checking_enabled(enabled);
        if !enabled {
            return;
        }
        // El contexto descarta los códigos sin diccionario instalado, de modo
        // que la lista efectiva dice cuál ha valido. Si no vale ninguno se
        // queda vacía y WebKitGTK recurre al idioma del sistema.
        for code in candidates {
            context.set_spell_checking_languages(&[code.as_str()]);
            if !context.spell_checking_languages().is_empty() {
                break;
            }
        }
    });
}

/*
  enchant pide el código con región: `es` no encuentra nada y `es_ES` sí. Como
  el documento solo declara el idioma (`es`, `pt-BR`), aquí se proponen las
  variantes habituales y el corrector se queda con la primera instalada.
*/
#[cfg(target_os = "linux")]
fn spell_checking_candidates(lang: &str) -> Vec<String> {
    const REGIONS: &[(&str, &[&str])] = &[
        ("ca", &["ES"]),
        ("cs", &["CZ"]),
        ("da", &["DK"]),
        ("el", &["GR"]),
        ("en", &["US", "GB"]),
        ("es", &["ES", "MX", "AR"]),
        ("eu", &["ES"]),
        ("gl", &["ES"]),
        ("nb", &["NO"]),
        ("nn", &["NO"]),
        ("pt", &["PT", "BR"]),
        ("sv", &["SE"]),
        ("uk", &["UA"]),
        ("zh", &["CN", "TW"]),
    ];

    let mut parts = lang.trim().split(['-', '_']).filter(|part| !part.is_empty());
    let Some(language) = parts.next().map(str::to_ascii_lowercase) else {
        return Vec::new();
    };
    if language.len() < 2 || !language.chars().all(|c| c.is_ascii_alphabetic()) {
        return Vec::new();
    }

    // Un idioma con región (`pt-BR`) ya es la primera opción tal cual.
    let mut candidates = Vec::new();
    if let Some(region) = parts.next() {
        if region.len() == 2 && region.chars().all(|c| c.is_ascii_alphabetic()) {
            candidates.push(format!("{language}_{}", region.to_ascii_uppercase()));
        }
    }
    let regions = REGIONS
        .iter()
        .find(|(code, _)| *code == language)
        .map(|(_, regions)| *regions)
        .unwrap_or(&[]);
    for region in regions {
        candidates.push(format!("{language}_{region}"));
    }
    // Para el resto de idiomas, `fi_FI` o `pl_PL` es la forma más común.
    candidates.push(format!("{language}_{}", language.to_ascii_uppercase()));
    candidates.push(language);
    candidates.dedup();
    candidates
}

/*
  La interfaz avisa del idioma efectivo del documento cada vez que cambia y de
  si el usuario quiere el corrector encendido.
*/
#[tauri::command]
fn set_spell_checking(
    #[allow(unused_variables)] app: tauri::AppHandle,
    #[allow(unused_variables)] enabled: bool,
    #[allow(unused_variables)] lang: String,
) {
    #[cfg(target_os = "linux")]
    if let Some(window) = app.get_webview_window("main") {
        apply_spell_checking(&window, enabled, spell_checking_candidates(&lang));
    }
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
            read_document_asset,
            update_target,
            install_downloaded_update,
            set_spell_checking
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

#[cfg(test)]
mod tests {
    use super::document_asset_bytes;

    /// Carpeta de trabajo con un documento y su imagen al lado, como la de
    /// cualquier artículo.
    fn carpeta_con_imagen(nombre: &str) -> std::path::PathBuf {
        let raiz = std::env::temp_dir().join(format!("edimark-test-{nombre}"));
        let imagenes = raiz.join("imagenes");
        std::fs::create_dir_all(&imagenes).expect("no se pudo crear la carpeta de prueba");
        std::fs::write(imagenes.join("01.png"), [137, 80, 78, 71]).expect("no se pudo escribir");
        std::fs::write(raiz.join("apuntes.md"), "# Apuntes").expect("no se pudo escribir");
        raiz
    }

    #[test]
    fn sirve_la_imagen_que_acompana_al_documento() {
        let raiz = carpeta_con_imagen("imagen");
        let ruta = raiz.join("imagenes").join("01.png");
        let bytes = document_asset_bytes(&ruta.to_string_lossy()).expect("debería leerse");
        assert_eq!(bytes, vec![137, 80, 78, 71]);
        let _ = std::fs::remove_dir_all(raiz);
    }

    #[test]
    fn no_sirve_archivos_que_no_son_imagenes() {
        let raiz = carpeta_con_imagen("markdown");
        let ruta = raiz.join("apuntes.md");
        // Un `![](apuntes.md)` no debe convertirse en una forma de leer
        // cualquier archivo del disco desde la interfaz.
        assert!(document_asset_bytes(&ruta.to_string_lossy()).is_err());
        let _ = std::fs::remove_dir_all(raiz);
    }

    #[test]
    fn exige_rutas_absolutas_y_archivos_existentes() {
        assert!(document_asset_bytes("imagenes/01.png").is_err());
        assert!(document_asset_bytes("/no/existe/01.png").is_err());
    }
}
