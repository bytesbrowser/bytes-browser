// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod app;
mod filesystem;

use app::tags::{add_tag, get_tags, TagCache};
use filesystem::volume::{get_volumes, safely_eject_removable};
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    num::NonZeroUsize,
    sync::{Arc, Mutex},
};
use tauri::Manager;
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
}

pub type StateSafe = Arc<Mutex<AppState>>;

pub type TagCacheSafe = Arc<Mutex<TagCache>>;

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
            add_tag,
            get_tags
        ])
        .manage(Arc::new(Mutex::new(AppState::default())))
        .manage(Arc::new(Mutex::new(TagCache::new(
            NonZeroUsize::new(1).unwrap(),
        ))))
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
