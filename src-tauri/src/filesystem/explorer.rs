use crate::error::{Error, GitError};
use crate::StateSafe;
use serde::Serialize;
use std::borrow::Cow;
use std::collections::HashMap;
use std::fs::{self, DirEntry};
use std::io::{self};
use std::ops::Deref;
use std::path::{Path, PathBuf};
use std::process::Command;
use tokio::fs::File;
use tokio::io::{AsyncBufReadExt, AsyncReadExt, BufReader};
use walkdir::WalkDir;

#[cfg(target_os = "windows")]
extern crate winapi;

use super::audio::generate_waveform;
use super::cache::FsEventHandler;
use super::git_utils::get_user_git_config_signature;
use super::volume::DirectoryChild;
use super::{get_file_description, AUDIO_EXTENSIONS, IMAGE_EXTENSIONS, TEXT_EXTENSIONS};
use git2::{ErrorCode, Repository, StashFlags};
use serde_json::Value as JsonValue;
use tauri::State;
use toml::Value as TomlValue;

#[derive(Serialize)]
pub struct DirectoryResult {
    data: Option<Vec<DirectoryChild>>,
    error: Option<String>,
}

#[derive(Debug, Serialize)]
pub enum ProjectType {
    NPM,
    Cargo,
}

#[derive(Debug, Serialize)]
pub struct ProjectMetadata {
    project_type: ProjectType,
    name: String,
    version: String,
    description: Option<String>,
    dependencies: HashMap<String, String>,
}

pub type GitResult<T> = std::result::Result<T, GitError>;

#[derive(Serialize)]
pub struct GitMeta {
    can_commit: bool,
    can_fetch: bool,
    can_pull: bool,
    can_init: bool,
    can_push: bool,
    can_stash: bool,
    branches: Vec<String>,
    current_branch: String,
}

#[tauri::command]
pub async fn paste_file_at(from: String, destination: String) -> Result<bool, String> {
    let from_path = Path::new(&from);
    let mut dest_path = PathBuf::from(destination);

    let mut counter = 1;
    while dest_path.exists() {
        let extension = dest_path
            .extension()
            .and_then(|os_str| os_str.to_str())
            .unwrap_or("");
        let without_extension = dest_path
            .file_stem()
            .and_then(|os_str| os_str.to_str())
            .unwrap_or("");
        dest_path.set_file_name(format!(
            "{}_{}{}",
            without_extension,
            counter,
            if extension.is_empty() {
                "".to_string()
            } else {
                format!(".{}", extension)
            }
        ));
        counter += 1;
    }

    match fs::copy(&from_path, &dest_path) {
        Ok(_) => Ok(true),
        Err(e) => Err(format!("Could not copy file: {}", e)),
    }
}

#[tauri::command]
pub async fn paste_directory_at(from: String, destination: String) -> Result<bool, String> {
    let from_path = Path::new(&from);
    let mut dest_path = PathBuf::from(&destination);

    if !from_path.is_dir() {
        return Err("Source is not a directory".to_string());
    }

    let mut counter = 1;
    while dest_path.exists() {
        dest_path = PathBuf::from(format!("{}_{}", destination, counter));
        counter += 1;
    }

    let copy_result = copy_dir(&from_path, &dest_path);
    match copy_result {
        Ok(_) => Ok(true),
        Err(e) => Err(format!("Could not copy directory: {}", e)),
    }
}

#[tauri::command]
pub async fn cut_file_from(from: String, destination: String) -> Result<bool, String> {
    let from_path = Path::new(&from);
    let dest_path = Path::new(&destination);

    // First, try the rename operation
    match fs::rename(&from_path, &dest_path) {
        Ok(_) => Ok(true),
        Err(_) => {
            // If rename fails, try copying and then deleting the original
            match fs::copy(&from_path, &dest_path) {
                Ok(_) => {
                    // After copying, delete the original file
                    match fs::remove_file(&from_path) {
                        Ok(_) => Ok(true),
                        Err(e) => Err(format!("Could not delete original file: {}", e)),
                    }
                }
                Err(e) => Err(format!("Could not copy file: {}", e)),
            }
        }
    }
}

#[tauri::command]
pub async fn cut_directory_from(from: String, destination: String) -> Result<bool, String> {
    let from_path = Path::new(&from);
    let dest_path = Path::new(&destination);

    if !from_path.is_dir() {
        return Err("Source is not a directory".to_string());
    }

    // First, try the rename operation
    match fs::rename(&from_path, &dest_path) {
        Ok(_) => Ok(true),
        Err(_) => {
            // If rename fails, try copying the directory recursively and then deleting the original
            match copy_dir_recursive(&from_path, &dest_path) {
                Ok(_) => {
                    // After copying, delete the original directory
                    match fs::remove_dir_all(&from_path) {
                        Ok(_) => Ok(true),
                        Err(e) => Err(format!("Could not delete original directory: {}", e)),
                    }
                }
                Err(e) => Err(format!("Could not copy directory: {}", e)),
            }
        }
    }
}

fn copy_dir_recursive(src: &Path, dest: &Path) -> std::io::Result<()> {
    if !src.is_dir() {
        return Err(std::io::Error::new(
            std::io::ErrorKind::InvalidInput,
            "Source is not a directory",
        ));
    }

    fs::create_dir_all(&dest)?;

    for entry_result in src.read_dir()? {
        let entry = entry_result?;
        let entry_path = entry.path();
        let dest_child = dest.join(entry.file_name());

        if entry_path.is_dir() {
            copy_dir_recursive(&entry_path, &dest_child)?;
        } else {
            fs::copy(&entry_path, &dest_child)?;
        }
    }

    Ok(())
}

// Helper function to recursively copy a directory
fn copy_dir(from: &Path, to: &Path) -> io::Result<()> {
    if !from.is_dir() {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "Source is not a directory",
        ));
    }

    fs::create_dir_all(to)?;

    for entry_result in fs::read_dir(from)? {
        let entry = entry_result?;
        let from_path = entry.path();
        let to_path = to.join(entry.file_name());

        if from_path.is_dir() {
            copy_dir(&from_path, &to_path)?;
        } else {
            fs::copy(&from_path, &to_path)?;
        }
    }
    Ok(())
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
    let extension = get_extension(&path).to_lowercase();

    if IMAGE_EXTENSIONS.contains(&extension.as_str()) {
        process_image(&path).await
    } else if TEXT_EXTENSIONS.contains(&extension.as_str()) {
        process_text(&path).await
    } else if AUDIO_EXTENSIONS.contains(&extension.as_str()) {
        process_audio(&path).await
    } else {
        Err(Error::Custom("Unsupported file type".to_string()))
    }
}

fn get_extension(path: &str) -> Cow<str> {
    Path::new(path)
        .extension()
        .unwrap_or_default()
        .to_string_lossy()
}

async fn process_text(path: &str) -> Result<String, Error> {
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
}

async fn process_image(path: &str) -> Result<String, Error> {
    let img = image::open(path).map_err(|e| Error::Custom(e.to_string()))?;
    let thumbnail = img.resize(150, 150, image::imageops::FilterType::Gaussian);

    // Convert image to bytes
    let mut buffer = std::io::Cursor::new(Vec::new());
    thumbnail
        .write_to(&mut buffer, image::ImageOutputFormat::Png)
        .map_err(|e| Error::Custom(e.to_string()))?;

    let base64_image = base64::encode(buffer.get_ref());
    Ok(format!("data:image/png;base64,{base64_image}"))
}

async fn process_audio(path: &str) -> Result<String, Error> {
    match generate_waveform(Path::new(&path)) {
        Ok(img) => {
            // Convert image to bytes
            let mut buffer = std::io::Cursor::new(Vec::new());
            img.write_to(&mut buffer, image::ImageOutputFormat::Png)
                .map_err(|e| Error::Custom(e.to_string()))?;
            let base64_image = base64::encode(buffer.get_ref());
            Ok(format!("data:image/png;base64,{base64_image}"))
        }
        Err(e) => Err(Error::Custom(e)),
    }
}

#[tauri::command]
pub async fn delete_file(
    state_mux: State<'_, StateSafe>,
    path: String,
    is_dir: bool,
    mount_point: String,
) -> Result<(), Error> {
    println!("Deleting file from cache: {}", path);

    let fs_event_manager = FsEventHandler::new(state_mux.deref().clone(), mount_point.into());

    let future_path = path.clone();

    tokio::spawn(async move {
        fs_event_manager.handle_delete(Path::new(&future_path));
    });

    if is_dir {
        let res = fs::remove_dir_all(&*path);
        match res {
            Ok(_) => Ok(()),
            Err(err) => Err(Error::Custom(err.to_string())),
        }
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

    let mut results = Vec::new();
    for entry in directory.filter_map(Result::ok) {
        match handle_entry(entry).await {
            Ok(child_vec) => results.extend(child_vec),
            Err(e) => {
                // Handle or log the error as needed.
            }
        }
    }

    Ok(results)
}

pub fn check_is_supported_project(path: String) -> Result<bool, std::io::Error> {
    // Check for NPM project
    let npm_project_path = Path::new(&path).join("package.json");
    if fs::metadata(&npm_project_path).is_ok() {
        return Ok(true);
    }

    // Check for Cargo project
    let cargo_project_path = Path::new(&path).join("Cargo.toml");
    if fs::metadata(&cargo_project_path).is_ok() {
        return Ok(true);
    }

    Ok(false)
}

#[tauri::command]
pub async fn get_supported_project_metadata(path: String) -> Result<ProjectMetadata, Error> {
    // Check for NPM project
    let npm_project_path = Path::new(&path).join("package.json");
    if let Ok(mut file) = File::open(npm_project_path).await {
        let mut contents = String::new();
        file.read_to_string(&mut contents).await;
        let data: JsonValue = serde_json::from_str(&contents).unwrap();

        let deps = match data["dependencies"].as_object() {
            Some(obj) => obj
                .iter()
                .map(|(k, v)| (k.clone(), v.as_str().unwrap_or("").to_string()))
                .collect(),
            None => HashMap::new(),
        };

        return Ok(ProjectMetadata {
            project_type: ProjectType::NPM,
            name: data["name"].as_str().unwrap_or("Unknown").to_string(),
            version: data["version"].as_str().unwrap_or("Unknown").to_string(),
            description: data["description"].as_str().map(|s| s.to_string()),
            dependencies: deps,
        });
    }

    // Check for Cargo project
    let cargo_project_path = Path::new(&path).join("Cargo.toml");
    if let Ok(mut file) = File::open(cargo_project_path).await {
        let mut contents = String::new();
        file.read_to_string(&mut contents).await?;
        let data: TomlValue = toml::from_str(&contents).unwrap();

        let deps = match data["dependencies"].as_table() {
            Some(table) => table
                .iter()
                .map(|(k, v)| {
                    (k.clone(), v.as_str().unwrap_or("").to_string()) // This assumes simple dependencies. Complex dependencies with version requirements can be more involved.
                })
                .collect(),
            None => HashMap::new(),
        };

        return Ok(ProjectMetadata {
            project_type: ProjectType::Cargo,
            name: data["package"]["name"]
                .as_str()
                .unwrap_or("Unknown")
                .to_string(),
            version: data["package"]["version"]
                .as_str()
                .unwrap_or("Unknown")
                .to_string(),
            description: data["package"]["description"]
                .as_str()
                .map(|s| s.to_string()),
            dependencies: deps,
        });
    }

    Err(Error::Custom("Not a supported project".to_string()))
}

async fn handle_entry(entry: DirEntry) -> io::Result<Vec<DirectoryChild>> {
    let file_name = entry.file_name().to_string_lossy().to_string();
    let path = entry.path().to_string_lossy().to_string();
    let size = fs::metadata(&path)?.len();
    let last_modified_sys_time = fs::metadata(&path)?.modified()?;

    let last_modified = match last_modified_sys_time.elapsed() {
        Ok(duration) => duration.as_secs(),
        Err(_) => 0,
    };

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
        let is_git = is_git_directory(&path).unwrap_or(false);

        let is_project = match check_is_supported_project(path.clone()) {
            Ok(is_project) => is_project,
            Err(_) => false,
        };

        Ok(vec![DirectoryChild::Directory(
            file_name,
            path,
            size,
            last_modified,
            "File".to_string(),
            is_git,
            is_project,
        )])
    }
}

#[tauri::command]
pub async fn open_file(path: &str) -> Result<(), Error> {
    let commands = open::commands(path);

    for mut command in commands {
        match command.output() {
            Ok(output) if output.status.success() => return Ok(()),
            Ok(output) => {
                let err_msg = String::from_utf8(output.stderr)
                    .unwrap_or_else(|_| "Failed to deserialize stderr.".to_string());
                eprintln!("Error: {}", err_msg);
            }
            Err(err) => {
                eprintln!("Error executing open command: {}", err);
            }
        }
    }

    Err(Error::Custom("All open commands failed.".to_string()))
}

#[tauri::command]
pub fn open_with_explorer(path: String) -> Result<(), Error> {
    open_with_explorer_internal(&path)
}

#[cfg(target_os = "windows")]
pub fn open_with_explorer_internal(path: &str) -> Result<(), Error> {
    let parent_dir = std::path::Path::new(path).parent();

    match parent_dir {
        Some(parent_path) => {
            match Command::new("explorer").arg(parent_path).spawn() {
                Ok(mut child) => {
                    // Wait for the process to finish
                    let status = child.wait()?;
                    if status.success() {
                        Ok(())
                    } else {
                        Err(Error::Custom(format!(
                            "Failed to open explorer: {:?}",
                            status
                        )))
                    }
                }
                Err(e) => Err(Error::Custom(e.to_string())),
            }
        }
        None => Err(Error::Custom("Invalid file path".to_string())),
    }
}

#[cfg(target_os = "macos")]
pub fn open_with_explorer_internal(path: &str) -> Result<(), Error> {
    let parent_dir = std::path::Path::new(path).parent();

    match parent_dir {
        Some(parent_path) => {
            match Command::new("open").arg("-R").arg(parent_path).spawn() {
                Ok(mut child) => {
                    // Wait for the process to finish
                    let status = child.wait()?;
                    if status.success() {
                        Ok(())
                    } else {
                        Err(Error::Custom(format!(
                            "Failed to open Finder: {:?}",
                            status
                        )))
                    }
                }
                Err(e) => Err(Error::Custom(e.to_string())),
            }
        }
        None => Err(Error::Custom("Invalid file path".to_string())),
    }
}

#[cfg(target_os = "linux")]
pub fn open_with_explorer_internal(path: &str) -> Result<(), Error> {
    let result = Command::new("xdg-open")
        .arg(path)
        .spawn()
        .map_err(|e| Error::Custom(e.to_string()))?;

    if result.success() {
        Ok(())
    } else {
        Err(Error::Custom("Failed to open file".to_string()))
    }
}

pub fn is_git_directory(path: &str) -> Result<bool, io::Error> {
    let path = Path::new(path);
    if !path.is_dir() {
        return Ok(false);
    }

    let entries = fs::read_dir(path)?;

    for entry in entries {
        match entry {
            Ok(entry) => {
                let path = entry.path();
                if path.is_dir() && path.file_name().unwrap() == ".git" {
                    return Ok(true);
                }
            }
            Err(_) => {}
        }
    }

    Ok(false)
}

#[tauri::command]
pub async fn get_git_meta_for_directory(path: &str) -> Result<GitMeta, Error> {
    let path = Path::new(path);
    if !path.is_dir() {
        return Err(Error::Custom("Not a directory".to_string()));
    }

    let mut can_init = !path.join(".git").exists();

    let repo = Repository::open(path);
    match repo {
        Ok(repo) => {
            // The directory is a Git repository
            can_init = false;

            let mut branches = Vec::new();
            let mut current_branch = String::new();

            if let Ok(head) = repo.head() {
                if let Some(branch) = head.shorthand() {
                    current_branch = branch.to_string();
                }
            }

            for b in repo.branches(None).unwrap() {
                let (branch, _) = b.unwrap();
                if let Some(name) = branch.name().unwrap() {
                    branches.push(name.to_string());
                }
            }

            let index = repo.index().unwrap();
            let can_commit = index.has_conflicts() || !index.is_empty();

            let mut can_push = false;
            if let Ok(head) = repo.head() {
                if let Some(branch) = head.shorthand() {
                    current_branch = branch.to_string();
                    if let Ok(branch_ref) =
                        repo.find_branch(&current_branch, git2::BranchType::Local)
                    {
                        can_push = branch_ref.upstream().is_ok();
                    }
                }
            }

            Ok(GitMeta {
                can_commit,
                can_fetch: true,
                can_pull: true,
                can_init,
                can_push,
                can_stash: true,
                branches,
                current_branch,
            })
        }
        Err(e) => {
            if e.code() == ErrorCode::NotFound {
                // The directory is not a Git repository
                Ok(GitMeta {
                    can_commit: false,
                    can_fetch: false,
                    can_pull: false,
                    can_init,
                    can_push: false,
                    can_stash: false,
                    branches: Vec::new(),
                    current_branch: String::new(),
                })
            } else {
                Err(Error::Custom("Something went wrong".to_string()))
            }
        }
    }
}

#[tauri::command]
pub async fn init_git_repo_in_directory(path: &str) -> Result<(), Error> {
    let path = Path::new(path);
    if !path.is_dir() {
        return Err(Error::Custom("Not a directory".to_string()));
    }

    let repo = Repository::init(path);
    match repo {
        Ok(_) => Ok(()),
        Err(e) => Err(Error::Custom(e.to_string())),
    }
}

#[tauri::command]
pub async fn fetch_repo_for_directory(path: String) -> Result<(), Error> {
    let status = Command::new("git")
        .arg("fetch")
        .current_dir(path)
        .status()?;

    if status.success() {
        Ok(())
    } else {
        Err(Error::Custom(
            "Failed to fetch the git repository".to_string(),
        ))
    }
}

#[tauri::command]
pub async fn stash_changes_for_directory(path: String) -> GitResult<()> {
    // Open the repository
    let mut repo = Repository::open(&path).map_err(GitError::OpenRepoError)?;

    let signature = get_user_git_config_signature().await?;

    // Stash the changes
    repo.stash_save(
        &signature,
        "Stashed by BytesBrowser",
        Some(StashFlags::INCLUDE_UNTRACKED),
    )
    .map_err(GitError::StashError)?;

    Ok(())
}

#[tauri::command]
pub async fn commit_changes_for_directory(path: String, message: String) -> Result<String, Error> {
    let output = Command::new("git")
        .arg("commit")
        .arg(format!("-m '{message}'"))
        .current_dir(path)
        .output()?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);

    if output.status.success() {
        Ok(stdout.to_string())
    } else {
        Err(Error::Custom(stderr.to_string()))
    }
}

#[tauri::command]
pub async fn push_changes_for_directory(path: String) -> Result<String, Error> {
    let repo = Repository::open(&path)
        .map_err(GitError::OpenRepoError)
        .unwrap();

    let mut current_branch = String::new();

    if let Ok(head) = repo.head() {
        if let Some(branch) = head.shorthand() {
            current_branch = branch.to_string();
        }
    }

    let output = Command::new("git")
        .arg("push")
        .arg("origin")
        .arg(current_branch)
        .current_dir(path)
        .output()?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);

    if output.status.success() {
        Ok(stdout.to_string())
    } else {
        Err(Error::Custom(stderr.to_string()))
    }
}

#[tauri::command]
pub async fn pull_changes_for_directory(path: String) -> Result<String, Error> {
    let repo = Repository::open(&path)
        .map_err(GitError::OpenRepoError)
        .unwrap();

    let mut current_branch = String::new();

    if let Ok(head) = repo.head() {
        if let Some(branch) = head.shorthand() {
            current_branch = branch.to_string();
        }
    }

    let output = Command::new("git")
        .arg("pull")
        .arg("origin")
        .arg(&current_branch)
        .current_dir(path)
        .output()?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);

    if output.status.success() {
        Ok(stdout.to_string())
    } else {
        Err(Error::Custom(stderr.to_string()))
    }
}

#[tauri::command]
pub async fn checkout_branch_for_directory(path: String, branch: String) -> Result<String, Error> {
    let output = Command::new("git")
        .arg("checkout")
        .arg(&branch)
        .current_dir(path)
        .output()?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);

    if output.status.success() {
        Ok(stdout.to_string())
    } else {
        Err(Error::Custom(stderr.to_string()))
    }
}

#[tauri::command]
pub async fn add_all_changes(path: String) -> Result<String, Error> {
    let output = Command::new("git")
        .arg("add")
        .arg(".")
        .current_dir(path)
        .output()?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);

    if output.status.success() {
        Ok(stdout.to_string())
    } else {
        Err(Error::Custom(stderr.to_string()))
    }
}

#[tauri::command]
pub async fn clear_recycle_bin(_window: tauri::Window) -> Result<(), Error> {
    // Windows-specific code
    #[cfg(target_os = "windows")]
    {
        use std::ptr;
        use winapi::um::shellapi::SHEmptyRecycleBinA;

        unsafe {
            SHEmptyRecycleBinA(ptr::null_mut(), ptr::null(), 0);
        }
    }

    // macOS-specific code
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;

        let status = Command::new("rm")
            .args(&["-rf", "~/.Trash/*"])
            .status()
            .expect("Failed to clear trash on macOS");

        if !status.success() {
            return Err(Error::from(std::io::Error::new(
                std::io::ErrorKind::Other,
                "Failed to clear trash on macOS",
            )));
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn get_files_for_paths(
    paths: Vec<String>,
) -> Result<HashMap<String, DirectoryResult>, Error> {
    let mut result_map: HashMap<String, DirectoryResult> = HashMap::new();

    for path in &paths {
        let path_obj = std::path::Path::new(path);
        let file_name = match path_obj.file_name() {
            Some(name) => name.to_string_lossy().to_string(),
            None => continue, // Skip this entry if it doesn't have a file name
        };

        let file_result = match fs::metadata(path) {
            Ok(metadata) => {
                if metadata.is_file() {
                    let size = metadata.len();
                    let last_modified_sys_time = metadata.modified()?;
                    let last_modified = last_modified_sys_time.elapsed().unwrap().as_secs();
                    let extension = std::path::Path::new(path)
                        .extension()
                        .unwrap_or_default()
                        .to_string_lossy()
                        .to_string();
                    let file_type = get_file_description(&extension);

                    DirectoryResult {
                        data: Some(vec![DirectoryChild::File(
                            file_name,
                            path.to_string(),
                            size,
                            last_modified,
                            file_type.to_string(),
                        )]),
                        error: None,
                    }
                } else {
                    DirectoryResult {
                        data: None,
                        error: Some("Not a file".to_string()),
                    }
                }
            }
            Err(err) => DirectoryResult {
                data: None,
                error: Some(err.to_string()),
            },
        };

        result_map.insert(path.clone(), file_result);
    }

    Ok(result_map)
}

#[tauri::command]
pub async fn get_folder_size(path: String) -> Result<u64, String> {
    let mut total_size: u64 = 0;

    for entry in WalkDir::new(path) {
        let entry = match entry {
            Ok(e) => e,
            Err(e) => return Err(format!("Error walking directory: {}", e)),
        };

        // If it's a file, add its size to the total size.
        if entry.file_type().is_file() {
            total_size += entry.metadata().map(|m| m.len()).unwrap_or(0);
        }
    }

    Ok(total_size)
}
