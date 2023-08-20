use lazy_static::lazy_static;
use lru::LruCache;
use serde::{Deserialize, Serialize};
use std::fs::{self, File};
use std::io::{self, Read, Write};
use std::num::NonZeroUsize;
use std::sync::Arc;
use std::time::Duration;
use tauri::State;
use tokio::time;

use crate::TagCacheSafe;

lazy_static! {
    pub static ref TAG_CACHE_FILE_PATH: String = {
        let mut cache_path = dirs::cache_dir().expect("Failed to get base cache path");
        cache_path.push(format!("{}.cache.bin", env!("CARGO_PKG_NAME")));
        cache_path.to_string_lossy().to_string()
    };
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TagDoc {
    uuid: String,
    file_paths: Vec<String>,
    identifier: String,
    color_hex: String,
}

pub struct TagCache {
    cache: LruCache<String, Vec<TagDoc>>,
}

impl TagCache {
    pub fn new(capacity: std::num::NonZeroUsize) -> Self {
        TagCache {
            cache: LruCache::new(capacity),
        }
    }

    pub fn insert(&mut self, key: String, value: Vec<TagDoc>) {
        self.cache.put(key, value);
    }

    pub fn get(&mut self, key: &String) -> Option<&Vec<TagDoc>> {
        self.cache.get(key)
    }

    pub fn save_to_disk(&self, path: &str) -> io::Result<()> {
        let cache_as_vec: Vec<(String, Vec<TagDoc>)> = self
            .cache
            .iter()
            .map(|(k, v)| (k.clone(), v.clone()))
            .collect();
        let data = bincode::serialize(&cache_as_vec).unwrap();
        let mut file = File::create(path)?;
        file.write_all(&data)?;
        Ok(())
    }

    pub fn load_from_disk(&self, path: &str) -> io::Result<Self> {
        let mut file = File::open(path)?;
        let mut contents = Vec::new();
        file.read_to_end(&mut contents)?;
        let cache_as_vec: Vec<(String, Vec<TagDoc>)> =
            bincode::deserialize(&contents).unwrap_or_default();

        let capacity =
            NonZeroUsize::new(cache_as_vec.len()).unwrap_or_else(|| NonZeroUsize::new(1).unwrap());
        let mut cache = LruCache::new(capacity);
        for (key, value) in cache_as_vec {
            cache.put(key, value);
        }

        Ok(Self { cache })
    }
}

#[tauri::command]
pub async fn get_tags(state_mux: State<'_, TagCacheSafe>) -> Result<Vec<String>, String> {
    let mut tags = Vec::new();

    let state = state_mux.lock().unwrap();

    match state.load_from_disk(&TAG_CACHE_FILE_PATH) {
        Ok(_) => {}
        Err(e) => {
            return Err(format!("Failed to load tag cache: {}", e));
        }
    }

    state.cache.iter().for_each(|(k, _)| {
        tags.push(k.clone());
    });

    start_cache_interval(&state_mux);

    Ok(tags)
}

#[tauri::command]
pub async fn add_tag(state_mux: State<'_, TagCacheSafe>, tag: String) -> Result<(), String> {
    let mut state = state_mux.lock().unwrap();

    state.cache.put(tag, Vec::new());

    Ok(())
}

/// Starts a constant interval loop where the cache is updated every ~30 seconds.
fn start_cache_interval(state_mux: &TagCacheSafe) {
    let state_clone = Arc::clone(state_mux);

    tokio::spawn(async move {
        // We use tokio spawn because async closures with std spawn is unstable
        let mut interval = time::interval(Duration::from_secs(60));
        interval.tick().await; // Wait 30 seconds before doing first re-cache

        loop {
            interval.tick().await;

            let guard = &mut state_clone.lock().unwrap();

            match guard.save_to_disk(&TAG_CACHE_FILE_PATH) {
                Ok(_) => {}
                Err(e) => {
                    println!("Failed to load tag cache: {}", e);
                }
            }
        }
    });
}
