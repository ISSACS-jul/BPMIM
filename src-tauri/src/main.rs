// Previene la aparición de la ventana de consola adicional en Windows en modo release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::path::PathBuf;
use tauri::Manager;

// Directorio donde se guardan las imágenes y datos de BPMIM
fn get_app_storage_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Error obteniendo app_data_dir: {}", e))?;
    let img_dir = app_dir.join("banco_imagenes");
    if !img_dir.exists() {
        fs::create_dir_all(&img_dir)
            .map_err(|e| format!("Error creando carpeta banco_imagenes: {}", e))?;
    }
    Ok(img_dir)
}

#[tauri::command]
async fn save_file_native(
    default_filename: String,
    content: String,
    filter_name: String,
    filter_ext: String,
) -> Result<Option<String>, String> {
    let file = rfd::AsyncFileDialog::new()
        .set_title("Guardar como...")
        .set_file_name(&default_filename)
        .add_filter(&filter_name, &[&filter_ext])
        .save_file()
        .await;

    if let Some(file_handle) = file {
        let path = file_handle.path().to_path_buf();
        fs::write(&path, content.as_bytes())
            .map_err(|e| format!("Error al escribir el archivo: {}", e))?;
        Ok(Some(path.display().to_string()))
    } else {
        Ok(None)
    }
}

#[tauri::command]
async fn save_binary_file_native(
    default_filename: String,
    data_base64: String,
    filter_name: String,
    filter_ext: String,
) -> Result<Option<String>, String> {
    let file = rfd::AsyncFileDialog::new()
        .set_title("Guardar como...")
        .set_file_name(&default_filename)
        .add_filter(&filter_name, &[&filter_ext])
        .save_file()
        .await;

    if let Some(file_handle) = file {
        let path = file_handle.path().to_path_buf();
        // Quitar prefijo data:...;base64, si existiera
        let b64_clean = if let Some(idx) = data_base64.find(";base64,") {
            &data_base64[idx + 8..]
        } else {
            &data_base64
        };

        // Decodificación simple de base64 estándar
        
        // Alternativa simple sin librerías externas complejas o usando decodificador básico
        let decoded = match decode_base64(b64_clean.as_bytes()) {
            Ok(bytes) => bytes,
            Err(e) => return Err(format!("Error decodificando base64: {}", e)),
        };

        fs::write(&path, decoded)
            .map_err(|e| format!("Error al escribir el archivo binario: {}", e))?;
        Ok(Some(path.display().to_string()))
    } else {
        Ok(None)
    }
}

fn decode_base64(input: &[u8]) -> Result<Vec<u8>, String> {
    const TABLE: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut map = [255u8; 256];
    for (i, &b) in TABLE.iter().enumerate() {
        map[b as usize] = i as u8;
    }

    let mut out = Vec::with_capacity(input.len() * 3 / 4);
    let mut buf = 0u32;
    let mut bits = 0;

    for &b in input {
        if b == b'=' || b == b'\r' || b == b'\n' || b == b' ' {
            continue;
        }
        let val = map[b as usize];
        if val == 255 {
            continue;
        }
        buf = (buf << 6) | (val as u32);
        bits += 6;
        if bits >= 8 {
            bits -= 8;
            out.push((buf >> bits) as u8);
        }
    }
    Ok(out)
}

#[derive(serde::Serialize, serde::Deserialize)]
struct DiskImageRecord {
    name: String,
    data: String,
}

#[tauri::command]
async fn save_disk_image(
    app: tauri::AppHandle,
    name: String,
    data_url: String,
) -> Result<(), String> {
    let dir = get_app_storage_dir(&app)?;
    let clean_name = name.replace(|c: char| !c.is_alphanumeric() && c != '.' && c != '-' && c != '_', "_");
    let file_path = dir.join(format!("{}.txt", clean_name));
    fs::write(file_path, data_url).map_err(|e| format!("Error guardando imagen en disco: {}", e))?;
    Ok(())
}

#[tauri::command]
async fn delete_disk_image(
    app: tauri::AppHandle,
    name: String,
) -> Result<(), String> {
    let dir = get_app_storage_dir(&app)?;
    let clean_name = name.replace(|c: char| !c.is_alphanumeric() && c != '.' && c != '-' && c != '_', "_");
    let file_path = dir.join(format!("{}.txt", clean_name));
    if file_path.exists() {
        let _ = fs::remove_file(file_path);
    }
    Ok(())
}

#[tauri::command]
async fn load_all_disk_images(app: tauri::AppHandle) -> Result<Vec<DiskImageRecord>, String> {
    let dir = get_app_storage_dir(&app)?;
    let mut records = Vec::new();
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() {
                if let Some(file_stem) = path.file_stem().and_then(|s| s.to_str()) {
                    if let Ok(data) = fs::read_to_string(&path) {
                        records.push(DiskImageRecord {
                            name: file_stem.to_string(),
                            data,
                        });
                    }
                }
            }
        }
    }
    Ok(records)
}

#[tauri::command]
async fn get_data_folder_path(app: tauri::AppHandle) -> Result<String, String> {
    let dir = get_app_storage_dir(&app)?;
    Ok(dir.display().to_string())
}

#[tauri::command]
async fn open_data_folder(app: tauri::AppHandle) -> Result<(), String> {
    let dir = get_app_storage_dir(&app)?;
    // Abrir con el explorador predeterminado del sistema operativo
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(dir)
            .spawn()
            .map_err(|e| format!("Error abriendo carpeta: {}", e))?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(dir)
            .spawn()
            .map_err(|e| format!("Error abriendo carpeta: {}", e))?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(dir)
            .spawn()
            .map_err(|e| format!("Error abriendo carpeta: {}", e))?;
    }
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            save_file_native,
            save_binary_file_native,
            save_disk_image,
            delete_disk_image,
            load_all_disk_images,
            get_data_folder_path,
            open_data_folder
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
