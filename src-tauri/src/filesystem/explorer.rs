use futures::{future, TryFutureExt};
use image::{ImageBuffer, Rgb};
use serde::Serialize;
use std::fs::{self, DirEntry};
use std::io::{self, Read};
use std::ops::Deref;
use std::path::Path;
use tokio::fs::File;
use tokio::io::{AsyncBufReadExt, AsyncReadExt, BufReader};
use tokio::task;

use crate::error::Error;
use crate::StateSafe;

use super::cache::FsEventHandler;
use super::get_file_description;
use super::utils::get_mount_point;
use super::volume::DirectoryChild;
use tauri::State;

use minimp3::{Decoder, Frame};

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

#[tauri::command]
pub async fn get_file_preview(path: String) -> Result<String, Error> {
    let extension = Path::new(&path)
        .extension()
        .unwrap_or_default()
        .to_string_lossy()
        .to_lowercase();

    if extension == "png" || extension == "jpg" || extension == "gif" || extension == "jpeg" {
        let img = image::open(&path).map_err(|e| Error::Custom(e.to_string()))?;
        let thumbnail = img.resize(150, 150, image::imageops::FilterType::Gaussian);

        // Convert image to bytes
        let mut buffer = std::io::Cursor::new(Vec::new());
        thumbnail
            .write_to(&mut buffer, image::ImageOutputFormat::Png)
            .map_err(|e| Error::Custom(e.to_string()))?;

        let base64_image = base64::encode(buffer.get_ref());
        Ok(format!("data:image/png;base64,{}", base64_image))
    } else if extension == "txt"
        || extension == "md"
        || extension == "rs"
        || extension == "js"
        || extension == "html"
        || extension == "css"
        || extension == "toml"
        || extension == "ts"
        || extension == "tsx"
        || extension == "jsx"
    {
        // handle text files (just like before)
        let file = File::open(&path)
            .await
            .map_err(|e| Error::Custom(e.to_string()))?;
        let mut reader = BufReader::new(file);
        let mut preview = String::new();
        for _ in 0..10 {
            let mut line = String::new();
            match reader.read_line(&mut line).await {
                Ok(bytes) => {
                    if bytes == 0 {
                        break; // EOF reached
                    }
                    preview.push_str(&line);
                }
                Err(e) => return Err(Error::Custom(e.to_string())),
            }
        }
        Ok(preview)
    } else if extension == "wav" || extension == "mp3" {
        match generate_waveform(Path::new(&path)) {
            Ok(img) => {
                // Convert image to bytes
                let mut buffer = std::io::Cursor::new(Vec::new());
                img.write_to(&mut buffer, image::ImageOutputFormat::Png)
                    .map_err(|e| Error::Custom(e.to_string()))?;
                let base64_image = base64::encode(buffer.get_ref());
                Ok(format!("data:image/png;base64,{}", base64_image))
            }
            Err(e) => Err(Error::Custom(e)),
        }
    } else {
        Err(Error::Custom("Unsupported file type".to_string()))
    }
}

fn read_mp3_samples(file_path: &str) -> Result<Vec<i16>, String> {
    let mut file = std::fs::File::open(file_path).map_err(|e| e.to_string())?;
    let mut mp3_data = Vec::new();
    file.read_to_end(&mut mp3_data).map_err(|e| e.to_string())?;

    let mut decoder = Decoder::new(mp3_data.as_slice());
    let mut samples = Vec::new();

    loop {
        match decoder.next_frame() {
            Ok(Frame { data, .. }) => {
                samples.extend_from_slice(&data);
            }
            Err(minimp3::Error::Eof) => break,
            Err(e) => return Err(e.to_string()),
        }
    }

    Ok(samples)
}

fn generate_waveform(path: &Path) -> Result<ImageBuffer<Rgb<u8>, Vec<u8>>, String> {
    let extension = path
        .extension()
        .unwrap_or_default()
        .to_string_lossy()
        .to_lowercase();

    let mut samples: Vec<f32> = vec![];

    if extension == "wav" {
        let mut reader = hound::WavReader::open(path).map_err(|e| e.to_string())?;
        samples = reader
            .samples::<i16>()
            .map(|s| s.map(|s| s as f32).unwrap_or(0.0))
            .collect();
    } else if extension == "mp3" {
        let mp3_samples = read_mp3_samples(path.to_str().ok_or("Invalid path")?)?;
        samples = mp3_samples.iter().map(|&s| s as f32).collect();
    } else {
        return Err("Unsupported audio format".to_string());
    }

    // Normalize samples
    let max_sample = samples.iter().cloned().fold(f32::MIN, f32::max).abs();
    for sample in &mut samples {
        *sample /= max_sample;
    }

    // Create an image buffer
    let width = 800;
    let height = 200;
    let mut img = ImageBuffer::new(width, height);

    let sample_count = samples.len();
    let samples_per_pixel = sample_count / width as usize;

    for x in 0..width {
        let start = x as usize * samples_per_pixel;
        let end = (x as usize + 1) * samples_per_pixel;
        let slice = &samples[start..end];

        let min = slice.iter().cloned().fold(f32::INFINITY, f32::min);
        let max = slice.iter().cloned().fold(f32::NEG_INFINITY, f32::max);

        let y_min = ((1.0 + min) * 0.5 * (height as f32)) as u32;
        let y_max = ((1.0 + max) * 0.5 * (height as f32)) as u32;

        for y in y_min..=y_max {
            if y < height {
                img.put_pixel(x, height - y - 1, Rgb([255, 255, 255]));
            }
        }
    }

    Ok(img)
}

#[tauri::command]
pub async fn delete_file(
    state_mux: State<'_, StateSafe>,
    path: String,
    is_dir: bool,
) -> Result<(), Error> {
    let mount_point_str = get_mount_point(path.clone()).unwrap_or_default();

    let fs_event_manager = FsEventHandler::new(state_mux.deref().clone(), mount_point_str.into());
    fs_event_manager.handle_delete(Path::new(&path));

    if is_dir {
        let res = fs::remove_dir_all(&path);
        return match res {
            Ok(_) => Ok(()),
            Err(err) => Err(Error::Custom(err.to_string())),
        };
    } else {
        let res = fs::remove_file(path);
        match res {
            Ok(_) => Ok(()),
            Err(err) => Err(Error::Custom(err.to_string())),
        }
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

    let extension = entry
        .path()
        .extension()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();
    let file_type = get_file_description(&extension);

    if entry.file_type()?.is_file() {
        Ok(vec![DirectoryChild::File(
            file_name,
            path,
            size,
            last_modified,
            file_type.to_string(),
        )])
    } else {
        Ok(vec![DirectoryChild::Directory(
            file_name,
            path,
            size,
            last_modified,
            "File".to_string(),
        )])
    }
}

#[tauri::command]
pub async fn open_file(path: String) -> Result<(), Error> {
    let output_res = open::commands(path)[0].output();

    let output = match output_res {
        Ok(output) => output,
        Err(err) => {
            let err_msg = format!("Failed to get open command output: {}", err);
            return Err(Error::Custom(err_msg));
        }
    };

    if output.status.success() {
        return Ok(());
    }

    let err_msg = String::from_utf8(output.stderr)
        .unwrap_or(String::from("Failed to open file and deserialize stderr."));
    Err(Error::Custom(err_msg))
}
