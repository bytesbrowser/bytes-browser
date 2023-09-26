use crate::error::Error;
use crate::filesystem::cache::{
    load_system_cache, run_cache_interval, save_system_cache, FsEventHandler, CACHE_FILE_PATH,
};
use crate::filesystem::{DIRECTORY, FILE};
use crate::{CachedPath, StateSafe};
use lazy_static::lazy_static;
use notify::{RecursiveMode, Watcher};
use rayon::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs::File;
use std::path::PathBuf;
use std::time::Instant;
use std::{fs, thread};
use sysinfo::{Disk, DiskExt, System, SystemExt};
use tauri::State;
use tokio::task::block_in_place;
use walkdir::WalkDir;

use enforce_single_instance::enforce_single_instance;

use super::cache::build_token_index_root;

const MACOS_RECYCLE_BIN_NAME: &str = ".Trash";

const WINDOWS_RECYCLE_BIN_NAME: &str = "$Recycle.Bin";

#[derive(Serialize, Deserialize, Clone)]
pub struct Volume {
    name: String,
    pub mount_point: PathBuf,
    used: u64,
    size: u64,
    available: u64,
    removable: bool,
    file_system_type: String,
    disk_type: String,
    recycle_bin_path: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub enum DirectoryChild {
    File(String, String, u64, u64, String), // Name of file, path to file, size of file, last modified seconds, type of file
    Directory(String, String, u64, u64, String, bool, bool), // Name of directory, path to directory, size of directory, last modified seconds, is git repo, isSupportedProject
}

impl Volume {
    fn from_disk(disk: &Disk) -> Self {
        let name = {
            let volume_name = disk.name().to_str().unwrap_or("Local Volume");
            if volume_name.is_empty() {
                "Local Volume"
            } else {
                volume_name
            }
            .to_string()
        };

        let available = disk.available_space();
        let mount_point = disk.mount_point().to_path_buf();
        let removable = disk.is_removable();
        let size = disk.total_space();
        let used = size - available; // Negligible optimization
        let file_system_type_raw = disk.file_system();

        let file_system_type = std::str::from_utf8(file_system_type_raw)
            .unwrap_or("Invalid UTF-8")
            .to_string();

        let disk_type = match disk.kind() {
            sysinfo::DiskKind::HDD => "HDD",
            sysinfo::DiskKind::SSD => "SSD",
            sysinfo::DiskKind::Unknown(_) => "Unknown",
        }
        .to_string();

        let recycle_bin_path = mount_point.join(match std::env::consts::OS {
            "macos" => MACOS_RECYCLE_BIN_NAME,
            "windows" => WINDOWS_RECYCLE_BIN_NAME,
            _ => "",
        });

        Self {
            name,
            available,
            mount_point,
            removable,
            size,
            used,
            file_system_type,
            disk_type,
            recycle_bin_path: recycle_bin_path.to_string_lossy().to_string(),
        }
    }

    /// This traverses the provided volume and adds the file structure to the cache in memory.
    fn create_cache(&self, state_mux: &StateSafe) {
        println!(
            "Creating cache for volume: {}",
            self.mount_point.to_string_lossy()
        );

        let new_entries: Vec<(String, CachedPath)> = WalkDir::new(self.mount_point.clone())
            .into_iter()
            .par_bridge()
            .filter_map(Result::ok)
            .map(|entry| {
                let file_name = entry.file_name().to_string_lossy().to_string();
                let file_path = entry.path().to_string_lossy().to_string();

                let walkdir_filetype = entry.file_type();
                let file_type = if walkdir_filetype.is_dir() {
                    DIRECTORY
                } else {
                    FILE
                }
                .to_string();

                (
                    file_name,
                    CachedPath {
                        file_path,
                        file_type,
                    },
                )
            })
            .collect();

        println!(
            "Finished creating cache for volume: {}",
            self.mount_point.to_string_lossy()
        );

        // Now update the cache with the new information
        let mut state = state_mux.lock().unwrap();

        println!(
            "Updating cache for volume: {}",
            self.mount_point.to_string_lossy()
        );

        let volume = state
            .system_cache
            .entry(self.mount_point.to_string_lossy().to_string())
            .or_insert_with(HashMap::new);

        for (file_name, new_entry) in new_entries {
            volume
                .entry(file_name)
                .or_insert_with(Vec::new)
                .push(new_entry);
        }
    }

    fn watch_changes(&self, state_mux: &StateSafe) -> Result<(), Box<dyn std::error::Error>> {
        let mut fs_event_manager = FsEventHandler::new(state_mux.clone(), self.mount_point.clone());
        let path = self.mount_point.clone();

        let watcher_result = notify::recommended_watcher(move |res| match res {
            Ok(event) => fs_event_manager.handle_event(event),
            Err(e) => eprintln!("Failed to handle event: {e}"),
        });

        let mut watcher = match watcher_result {
            Ok(w) => w,
            Err(e) => return Err(Box::new(e)),
        };

        thread::spawn(move || {
            if let Err(e) = watcher.watch(&path, RecursiveMode::Recursive) {
                eprintln!("Failed to watch path: {e}");
            }

            block_in_place(|| loop {
                thread::park();
            });
        });

        Ok(())
    }
}

/// Gets list of volumes and returns them.
/// If there is a cache stored on volume it is loaded.
/// If there is no cache stored on volume, one is created as well as stored in memory.
#[tauri::command]
pub async fn get_volumes(
    state_mux: State<'_, StateSafe>,
    window: tauri::Window,
) -> Result<Vec<Volume>, Error> {
    get_volumes_internal(state_mux, window).await
}

#[enforce_single_instance]
pub async fn get_volumes_internal(
    state_mux: State<'_, StateSafe>,
    window: tauri::Window,
) -> Result<Vec<Volume>, Error> {
    let start_time = Instant::now();
    println!("Getting volumes...");

    window.emit("get_volumes_event", "Getting volumes");

    let sys = System::new_all();

    let cache_exists = if fs::metadata(&CACHE_FILE_PATH[..]).is_ok() {
        load_system_cache(&state_mux)
    } else {
        File::create(&CACHE_FILE_PATH[..])?;
        false
    };

    match window.emit("get_volumes_event", "Getting disks") {
        Ok(_) => {}
        Err(e) => {
            println!("Error emitting event: {}", e);
        }
    };

    let start_time_disks = Instant::now();
    println!("Getting disks...");

    let disks = sys.disks();

    let volumes_futures: Vec<_> = disks
        .iter()
        .map(|disk| async {
            let volume = Volume::from_disk(disk);
            if !cache_exists {
                volume.create_cache(&state_mux);
            }

            match volume.watch_changes(&state_mux) {
                Ok(_) => {}
                Err(e) => {
                    println!("Error watching changes: {}", e);
                }
            }

            match window.emit("volume_read", &volume) {
                Ok(_) => {}
                Err(e) => {
                    println!("Error emitting event: {}", e);
                }
            }

            volume
        })
        .collect();

    let volumes_results: Vec<_> = futures::future::join_all(volumes_futures).await;

    let volumes: Vec<_> = volumes_results.into_iter().collect();

    let end_time_disks = Instant::now();
    println!(
        "Getting disks took: {:?}",
        end_time_disks - start_time_disks
    );

    if !cache_exists {
        match window.emit("get_volumes_event", "Saving system cache") {
            Ok(_) => {}
            Err(e) => {
                println!("Error emitting event: {}", e);
            }
        }
        save_system_cache(&state_mux);
    }

    run_cache_interval(&state_mux);

    match window.emit("get_volumes_event", "Indexing files") {
        Ok(_) => {}
        Err(e) => {
            println!("Error emitting event: {}", e);
        }
    }

    match build_token_index_root(&state_mux) {
        Ok(_) => {}
        Err(e) => {
            println!("Error building token index: {}", e);
        }
    };

    match window.emit("search_ready", true) {
        Ok(_) => {}
        Err(e) => {
            println!("Error emitting event: {}", e);
        }
    }

    let end_time = Instant::now();
    println!("Getting volumes took: {:?}", end_time - start_time);

    Ok(volumes)
}

#[tauri::command]
pub async fn safely_eject_removable(mount_path: String, platform: String) -> Result<bool, String> {
    let mut sys = System::new_all();
    sys.refresh_all();

    let volume = sys
        .disks()
        .iter()
        .find(|disk| disk.mount_point().to_string_lossy() == mount_path);

    if let Some(volume) = volume {
        if volume.is_removable() {
            let (cmd, args) = match platform.as_str() {
                "windows" => {
                    let vol_name = volume.name().to_str().unwrap();
                    let vol_name_stripped = vol_name.trim_end_matches('\\');
                    (
                        "mountvol".to_string(),
                        vec![vol_name_stripped.to_string(), "/P".to_string()],
                    )
                }
                "linux" => {
                    let command_str =
                        format!("udisksctl unmount -b {}", volume.name().to_str().unwrap());
                    ("sh".to_string(), vec!["-c".to_string(), command_str])
                }
                "darwin" => {
                    let command_str = format!(
                        "diskutil unmount {}",
                        volume.mount_point().to_string_lossy()
                    );
                    ("sh".to_string(), vec!["-c".to_string(), command_str])
                }
                _ => return Err(format!("Unsupported platform: {platform}")),
            };

            let output = std::process::Command::new(cmd)
                .args(&args)
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
