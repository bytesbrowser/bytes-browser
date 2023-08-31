use std::collections::HashMap;
use std::fs::{self, File};
use std::io::BufReader;
use std::path::{Path, PathBuf};
use std::sync::{Arc, MutexGuard};

use crate::filesystem::{DIRECTORY, FILE};
use crate::search::build_token_index;
use crate::{AppState, CachedPath, StateSafe, VolumeCache};
use lazy_static::lazy_static;
use notify::event::{CreateKind, ModifyKind, RenameMode};
use notify::Event;
use rayon::prelude::{IntoParallelRefIterator, ParallelIterator};
use std::io::Write;
use std::time::{Duration, Instant};
use tokio::time;

lazy_static! {
    pub static ref CACHE_FILE_PATH: String = {
        let mut cache_path = dirs::cache_dir().expect("Failed to get base cache path");
        cache_path.push(format!("{}.cache.bin", env!("CARGO_PKG_NAME")));
        cache_path.to_string_lossy().to_string()
    };
}

pub struct FsEventHandler {
    state_mux: StateSafe,
    mountpoint: PathBuf,
}

impl FsEventHandler {
    pub fn new(state_mux: StateSafe, mountpoint: PathBuf) -> Self {
        Self {
            state_mux,
            mountpoint,
        }
    }

    /// Gets the current volume from the cache
    fn get_from_cache<'a>(&self, state: &'a mut AppState) -> &'a mut VolumeCache {
        let mountpoint = self.mountpoint.to_string_lossy().to_string();

        state.system_cache.get_mut(&mountpoint).unwrap_or_else(|| {
            panic!(
                "Failed to find mountpoint '{:?}' in cache.",
                self.mountpoint
            )
        })
    }

    pub fn handle_create(&self, kind: CreateKind, path: &Path) {
        let state = &mut self.state_mux.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
        let current_volume = self.get_from_cache(state);

        let filename = path.file_name().unwrap().to_string_lossy().to_string();
        let file_type = match kind {
            CreateKind::File => FILE,
            CreateKind::Folder => DIRECTORY,
            _ => return, // Other options are weird lol
        }
        .to_string();

        let file_path = path.to_string_lossy().to_string();
        current_volume.entry(filename).or_insert_with(|| {
            vec![CachedPath {
                file_path,
                file_type,
            }]
        });
    }

    pub fn handle_delete(&self, path: &Path) {
        let state = &mut self.state_mux.lock().unwrap();
        let current_volume = self.get_from_cache(state);

        let filename = path.file_name().unwrap().to_string_lossy().to_string();
        current_volume.remove(&filename);
    }

    /// Removes file from cache, when `handle_rename_to` is called a new file is added to the cache in place.
    pub fn handle_rename_from(&mut self, old_path: &Path) {
        let state = &mut self.state_mux.lock().unwrap();
        let current_volume = self.get_from_cache(state);

        let old_path_string = old_path.to_string_lossy().to_string();
        let old_filename = old_path.file_name().unwrap().to_string_lossy().to_string();

        let empty_vec = &mut Vec::new();
        let cached_paths = current_volume.get_mut(&old_filename).unwrap_or(empty_vec);

        // If there is only one item in the cached paths, this means it can only be the renamed file and therefore it should be removed from the hashmap
        if cached_paths.len() <= 1 {
            current_volume.remove(&old_filename);
            return;
        }

        cached_paths.retain(|path| path.file_path != old_path_string);
    }

    /// Adds new file name & path to cache.
    pub fn handle_rename_to(&self, new_path: &Path) {
        let state = &mut self.state_mux.lock().unwrap();
        let current_volume = self.get_from_cache(state);

        let filename = new_path.file_name().unwrap().to_string_lossy().to_string();
        let file_type = if new_path.is_dir() { DIRECTORY } else { FILE };

        let path_string = new_path.to_string_lossy().to_string();
        current_volume.entry(filename).or_insert_with(|| {
            vec![CachedPath {
                file_path: path_string,
                file_type: String::from(file_type),
            }]
        });
    }

    pub fn handle_event(&mut self, event: Event) {
        let paths = event.paths;

        match event.kind {
            notify::EventKind::Modify(modify_kind) => {
                if modify_kind == ModifyKind::Name(RenameMode::From) {
                    self.handle_rename_from(&paths[0]);
                } else if modify_kind == ModifyKind::Name(RenameMode::To) {
                    self.handle_rename_to(&paths[0]);
                }
            }
            notify::EventKind::Create(kind) => self.handle_create(kind, &paths[0]),
            notify::EventKind::Remove(_) => self.handle_delete(&paths[0]),
            _ => (),
        }
    }
}

/// Starts a constant interval loop where the cache is updated every ~30 seconds.
pub fn run_cache_interval(state_mux: &StateSafe) {
    let state_clone = Arc::clone(state_mux);

    tokio::spawn(async move {
        let cache_interval = Duration::from_secs(60);
        let initial_delay = Duration::from_secs(30); // If you intended 30 seconds before first cache
        tokio::time::sleep(initial_delay).await;

        let mut interval = time::interval(cache_interval);

        loop {
            interval.tick().await;

            match state_clone.lock() {
                Ok(mut guard) => {
                    save_to_cache(&mut guard);
                }
                Err(poisoned) => {
                    eprintln!("Mutex was poisoned. Recovering and using the data.");
                    let mut guard = poisoned.into_inner();
                    save_to_cache(&mut guard);
                }
            }
        }
    });
}

/// This takes in an Arc<Mutex<AppState>> and calls `save_to_cache` after locking it.
pub fn save_system_cache(state_mux: &StateSafe) {
    let state = &mut state_mux.lock().unwrap();
    save_to_cache(state);
}

pub fn build_token_index_root(state_mux: &StateSafe) {
    let start_time = Instant::now();
    println!("Building token index cache");

    let mut state = state_mux.lock().unwrap();

    let all_tokens: Vec<_> = state
        .system_cache
        .par_iter()
        .map(|(_, cache)| build_token_index(cache))
        .collect();

    let mut token_index = HashMap::new();

    for token in all_tokens {
        for (key, value) in token {
            token_index
                .entry(key)
                .or_insert_with(Vec::new)
                .extend(value);
        }
    }

    let end_time = Instant::now();
    println!("Build token cache took: {:?}", end_time - start_time);

    state.token_cache = token_index;
}

/// Gets the cache from the state (in memory), encodes and saves it to the cache file path.
/// This needs optimising.
fn save_to_cache(state: &mut MutexGuard<AppState>) {
    let serialized_cache = serde_bencode::to_string(&state.system_cache).unwrap();

    println!("Saving cache to disk.");

    let mut file = fs::OpenOptions::new()
        .write(true)
        .truncate(true)
        .open(&CACHE_FILE_PATH[..])
        .unwrap();

    file.write_all(
        &zstd::encode_all(serialized_cache.as_bytes(), 0)
            .expect("Failed to compress cache contents.")[..],
    )
    .unwrap();
}

/// Reads and decodes the cache file and stores it in memory for quick access.
/// Returns false if the cache was unable to deserialize.
pub fn load_system_cache(state_mux: &StateSafe) -> bool {
    let cache_file = File::open(&CACHE_FILE_PATH[..]);
    if cache_file.is_err() {
        println!("Failed to open cache file.");
        return false;
    }

    let reader = BufReader::new(cache_file.unwrap());

    let decompressed = zstd::decode_all(reader);
    if decompressed.is_err() {
        println!("Failed to decompress cache file.");
        return false;
    }

    let system_cache_result: Result<HashMap<String, VolumeCache>, _> =
        serde_bencode::from_bytes(&decompressed.unwrap());
    if system_cache_result.is_err() {
        println!(
            "Failed to deserialize the volume cache from disk. {}",
            system_cache_result.err().unwrap()
        );
        return false;
    }

    let state = state_mux.lock();
    if state.is_err() {
        println!("Failed to lock mutex.");
        return false;
    }

    state.unwrap().system_cache = system_cache_result.unwrap();
    true
}
