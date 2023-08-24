use futures::future;
use serde::Serialize;
use std::fs::{self, DirEntry};
use std::io;
use std::path::Path;
use tokio::task;

use super::volume::DirectoryChild;

#[derive(Serialize)]
pub struct DirectoryResult {
    data: Option<Vec<DirectoryChild>>,
    error: Option<String>,
}

#[tauri::command]
pub async fn open_directory(path: String) -> DirectoryResult {
    match fetch_directory(path).await {
        Ok(data) => DirectoryResult {
            data: Some(data),
            error: None,
        },
        Err(err) => DirectoryResult {
            data: None,
            error: Some(err.to_string()),
        },
    }
}

async fn fetch_directory(path: String) -> io::Result<Vec<DirectoryChild>> {
    let directory = fs::read_dir(&path)?;

    let tasks: Vec<_> = directory
        .filter_map(|entry| {
            match entry {
                Ok(entry) => Some(task::spawn(handle_entry(entry))),
                Err(_) => None, // You can handle errors more gracefully if needed.
            }
        })
        .collect();

    let task_results: Result<Vec<_>, _> = future::try_join_all(tasks).await;

    match task_results {
        Ok(results) => {
            let mut final_results = Vec::new();

            for res in results {
                match res {
                    Ok(child_vec) => final_results.extend(child_vec),
                    Err(e) => {
                        // Handle or log individual task errors as needed.
                    }
                }
            }

            Ok(final_results)
        }
        Err(join_err) => {
            // Handle the JoinError if needed
            Err(io::Error::new(io::ErrorKind::Other, join_err.to_string()))
        }
    }
}

async fn handle_entry(entry: DirEntry) -> io::Result<Vec<DirectoryChild>> {
    let file_name = entry.file_name().to_string_lossy().to_string();
    let path = entry.path().to_string_lossy().to_string();
    let size = fs::metadata(&path)?.len();
    let last_modified_sys_time = fs::metadata(&path)?.modified()?;

    let last_modified = last_modified_sys_time.elapsed().unwrap().as_secs();

    if entry.file_type()?.is_file() {
        Ok(vec![DirectoryChild::File(
            file_name,
            path,
            size,
            last_modified,
        )])
    } else {
        Ok(vec![DirectoryChild::Directory(
            file_name,
            path,
            size,
            last_modified,
        )])
    }
}
