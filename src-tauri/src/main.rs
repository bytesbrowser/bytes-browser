// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod error;
mod filesystem;
mod search;

use filesystem::explorer::{delete_file, get_file_preview, open_directory, open_file};
use filesystem::volume::{get_volumes, safely_eject_removable};
use search::search_directory;
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    sync::{Arc, Mutex},
};
use tauri::Manager;
use tauri::State;
use window_shadows::set_shadow;

#[derive(Serialize, Deserialize)]
pub struct CachedPath {
    #[serde(rename = "p")]
    file_path: String,
    #[serde(rename = "t")]
    file_type: String,
}

pub type VolumeCache = HashMap<String, Vec<CachedPath>>;

#[derive(Default)]
pub struct AppState {
    system_cache: HashMap<String, VolumeCache>,
    token_cache: HashMap<String, Vec<String>>,
}

pub type StateSafe = Arc<Mutex<AppState>>;

#[tokio::main]
async fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let window = app.get_window("main").unwrap();

            #[cfg(any(windows, target_os = "macos"))]
            set_shadow(&window, true).unwrap();
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_volumes,
            safely_eject_removable,
            get_environment_variable,
            open_directory,
            open_file,
            search_directory,
            get_volume_for_path,
            delete_file,
            get_file_preview
        ])
        .manage(Arc::new(Mutex::new(AppState::default())))
        .plugin(tauri_plugin_store::Builder::default().build())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn get_environment_variable(name: &str) -> String {
    std::env::var(name).unwrap_or_else(|_| "".to_string())
}

#[tauri::command]
fn get_volume_for_path(path: &str, state_mux: State<'_, StateSafe>) -> Option<String> {
    let state = state_mux.lock().unwrap();

    for (volume, cache) in state.system_cache.iter() {
        for cached_path in cache.values().flatten() {
            if cached_path.file_path == path {
                return Some(volume.to_string());
            }
        }
    }

    None
}
