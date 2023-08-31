use crate::error::{Error, GitError};
use crate::StateSafe;
use clipboard::{ClipboardContext, ClipboardProvider};
use futures::future;
use serde::Serialize;
use std::borrow::Cow;
use std::collections::HashMap;
use std::fs::{self, DirEntry};
use std::io::{self};
use std::ops::Deref;
use std::path::Path;
use std::process::Command;
use tokio::fs::File;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::task;

use super::audio::generate_waveform;
use super::cache::FsEventHandler;
use super::git_utils::get_user_git_config_signature;
use super::utils::get_mount_point;
use super::volume::DirectoryChild;
use super::{get_file_description, AUDIO_EXTENSIONS, IMAGE_EXTENSIONS, TEXT_EXTENSIONS};
use git2::{ErrorCode, Repository, StashFlags};
use tauri::State;

#[derive(Serialize)]
pub struct DirectoryResult {
    data: Option<Vec<DirectoryChild>>,
    error: Option<String>,
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
pub async fn copy_file(path: String) -> bool {
    let file_data = match std::fs::read(path).map_err(|e| e.to_string()) {
        Ok(data) => data,
        Err(_) => return false,
    };

    let mut ctx: ClipboardContext = ClipboardProvider::new().unwrap();

    ctx.set_contents(String::from_utf8_lossy(&file_data).to_string())
        .is_ok()
}

#[tauri::command]
pub async fn paste_file_at(destination: String) -> bool {
    unimplemented!()
}

#[tauri::command]
pub async fn move_file_from(source: String, destination: String) -> bool {
    match fs::rename(&source, &destination) {
        Ok(_) => true,
        Err(_) => false,
    }
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
) -> Result<(), Error> {
    let mount_point_str = get_mount_point(path.clone()).unwrap_or_default();

    let fs_event_manager = FsEventHandler::new(state_mux.deref().clone(), mount_point_str.into());
    fs_event_manager.handle_delete(Path::new(&path));

    if is_dir {
        let res = fs::remove_dir_all(&path);
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
                    Err(_e) => {
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
        let is_git = is_git_directory(&path).unwrap_or(false);

        Ok(vec![DirectoryChild::Directory(
            file_name,
            path,
            size,
            last_modified,
            "File".to_string(),
            is_git,
        )])
    }
}

#[tauri::command]
pub async fn open_file(path: String) -> Result<(), Error> {
    let output_res = open::commands(path)[0].output();

    let output = match output_res {
        Ok(output) => output,
        Err(err) => {
            let err_msg = format!("Failed to get open command output: {err}");
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
        use objc::runtime::Class;
        use objc::runtime::Object;
        use objc_foundation::{INSObject, INSString, NSString};
        use objc_id::Id;

        unsafe {
            let pool = Class::get("NSAutoreleasePool").unwrap();
            let pool: *mut Object = msg_send![pool.alloc().unwrap(), init];

            let file_manager: Id<Object> =
                msg_send![Class::get("NSFileManager").unwrap().alloc().unwrap(), init];
            let trash_url: Id<Object> = msg_send![file_manager, URLForDirectory:1
                                                                           inDomain:1
                                                                      appropriateFor:nil
                                                                                 create:false
                                                                                  error:nil];
            let trash_path: Id<NSString> = msg_send![trash_url, path];
            let _: msg_send![file_manager, removeItemAtPath:trash_path error:nil];

            msg_send![pool, release];
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
