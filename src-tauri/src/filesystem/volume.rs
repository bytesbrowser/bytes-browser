use crate::filesystem::cache::{
    load_system_cache, run_cache_interval, save_system_cache, FsEventHandler, CACHE_FILE_PATH,
};
use crate::filesystem::{DIRECTORY, FILE};
use crate::{CachedPath, StateSafe};
use notify::{RecursiveMode, Watcher};
use rayon::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs::File;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::{fs, thread};
use sysinfo::{Disk, DiskExt, System, SystemExt};
use tauri::State;
use tokio::task::block_in_place;
use walkdir::WalkDir;

#[derive(Serialize)]
pub struct Volume {
    name: String,
    mount_point: PathBuf,
    used: u64,
    size: u64,
    available: u64,
    removable: bool,
    file_system_type: String,
    disk_type: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub enum DirectoryChild {
    File(String, String), // Name of file, path to file
    Directory(String, String),
}

impl Volume {
    fn from_disk(disk: &Disk) -> Self {
        let name = {
            let volume_name = disk.name().to_str().unwrap();
            match volume_name.is_empty() {
                true => "Local Volume",
                false => volume_name,
            }
            .to_string()
        };

        let available = disk.available_space();
        let mount_point = disk.mount_point().to_path_buf();
        let removable = disk.is_removable();
        let size = disk.total_space();
        let used = disk.total_space() - disk.available_space();
        let file_system_type_raw = disk.file_system();

        let file_system_type = match std::str::from_utf8(file_system_type_raw) {
            Ok(s) => s,
            Err(_) => {
                // Handle the error if the bytes aren't valid UTF-8
                // For this example, I'm using a default string
                "Invalid UTF-8"
            }
        }
        .to_string()
        .clone();

        let disk_type = match disk.kind() {
            sysinfo::DiskKind::HDD => "HDD",
            sysinfo::DiskKind::SSD => "SSD",
            sysinfo::DiskKind::Unknown(_) => "Unknown",
        }
        .to_string();

        Self {
            name,
            available,
            mount_point,
            removable,
            size,
            used,
            file_system_type,
            disk_type,
        }
    }

    /// This traverses the provided volume and adds the file structure to the cache in memory.
    fn create_cache(&self, state_mux: &StateSafe) {
        let state = &mut state_mux.lock().unwrap();

        let volume = state
            .system_cache
            .entry(self.mount_point.to_string_lossy().to_string())
            .or_insert_with(HashMap::new);

        let system_cache = Arc::new(Mutex::new(volume));

        WalkDir::new(self.mount_point.clone())
            .into_iter()
            .par_bridge()
            .filter_map(Result::ok)
            .for_each(|entry| {
                let file_name = entry.file_name().to_string_lossy().to_string();
                let file_path = entry.path().to_string_lossy().to_string();

                let walkdir_filetype = entry.file_type();
                let file_type = if walkdir_filetype.is_dir() {
                    DIRECTORY
                } else {
                    FILE
                }
                .to_string();

                let cache_guard = &mut system_cache.lock().unwrap();
                cache_guard
                    .entry(file_name)
                    .or_insert_with(Vec::new)
                    .push(CachedPath {
                        file_path,
                        file_type,
                    });
            });
    }

    fn watch_changes(&self, state_mux: &StateSafe) {
        let mut fs_event_manager = FsEventHandler::new(state_mux.clone(), self.mount_point.clone());

        let mut watcher = notify::recommended_watcher(move |res| match res {
            Ok(event) => fs_event_manager.handle_event(event),
            Err(e) => panic!("Failed to handle event: {}", e),
        })
        .unwrap();

        let path = self.mount_point.clone();

        thread::spawn(move || {
            watcher.watch(&path, RecursiveMode::Recursive).unwrap();

            block_in_place(|| loop {
                thread::park();
            });
        });
    }
}

/// Gets list of volumes and returns them.
/// If there is a cache stored on volume it is loaded.
/// If there is no cache stored on volume, one is created as well as stored in memory.
#[tauri::command]
pub async fn get_volumes(state_mux: State<'_, StateSafe>) -> Result<Vec<Volume>, ()> {
    let mut sys = System::new_all();
    sys.refresh_all();

    let cache_exists = if fs::metadata(&CACHE_FILE_PATH[..]).is_ok() {
        load_system_cache(&state_mux)
    } else {
        File::create(&CACHE_FILE_PATH[..]).unwrap();
        false
    };

    let disks = sys.disks();

    // Use futures::future::join_all to await multiple futures concurrently
    let volumes_futures: Vec<_> = disks
        .iter()
        .map(|disk| async {
            let volume = Volume::from_disk(disk);
            if !cache_exists {
                volume.create_cache(&state_mux);
            }
            volume.watch_changes(&state_mux);
            volume
        })
        .collect();

    let volumes_results: Vec<_> = futures::future::join_all(volumes_futures).await;

    let volumes: Vec<_> = volumes_results.into_iter().collect();

    if !cache_exists {
        save_system_cache(&state_mux);
        run_cache_interval(&state_mux);
    };

    Ok(volumes)
}

#[tauri::command]
pub async fn safely_eject_removable(mount_path: String) -> Result<bool, String> {
    // get volume
    let mut sys = System::new_all();
    sys.refresh_all();

    let volume = sys
        .disks()
        .iter()
        .find(|disk| disk.mount_point().to_string_lossy().to_string() == mount_path);

    if let Some(volume) = volume {
        if volume.is_removable() {
            let mut command = String::from("udisksctl unmount -b ");
            command.push_str(volume.name().to_str().unwrap());

            let output = std::process::Command::new("sh")
                .arg("-c")
                .arg(command)
                .output()
                .expect("failed to execute process");

            if output.status.success() {
                return Ok(true);
            } else {
                return Err(String::from_utf8(output.stderr).unwrap());
            }
        }
    }

    Ok(true)
}
