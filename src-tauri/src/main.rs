// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod account;
mod filesystem;

use account::accounts::{create_account, login};
use filesystem::volume::{get_volumes, safely_eject_removable};
use mongodb::{
    bson::doc,
    options::{ClientOptions, ServerApi, ServerApiVersion},
    Client,
};
use serde::{Deserialize, Serialize};
use std::error::Error;
use std::{
    collections::HashMap,
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

pub type DBSafe = Arc<Mutex<Client>>;

#[tokio::main]
async fn main() {
    let db = setup_db().await.unwrap();

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
            create_account,
            login
        ])
        .manage(Arc::new(Mutex::new(AppState::default())))
        .manage(Arc::new(Mutex::new(db)))
        .plugin(tauri_plugin_store::Builder::default().build())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

async fn setup_db() -> Result<Client, Box<dyn Error>> {
    let mut client_options =
    ClientOptions::parse("mongodb+srv://nthnlrichards:JVMv52K7z3mU7WiV@bytes-browser.fmduvul.mongodb.net/?retryWrites=true&w=majority").await?;
    // Set the server_api field of the client_options object to Stable API version 1
    let server_api = ServerApi::builder().version(ServerApiVersion::V1).build();
    client_options.server_api = Some(server_api);
    // Get a handle to the cluster
    let client = Client::with_options(client_options)
        .unwrap_or_else(|_| panic!("Failed to initialize standalone mongodb client."));
    // Ping the server to see if you can connect to the cluster
    client
        .database("admin")
        .run_command(doc! {"ping": 1}, None)
        .await?;
    println!("Pinged your deployment. You successfully connected to MongoDB!");

    Ok(client)
}
