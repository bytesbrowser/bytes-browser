use std::fs::{self, File};
use std::io::{self, Read, Write};
use std::path::Path;
use walkdir::WalkDir;
use zip::write::FileOptions;

use crate::error::Error;

#[tauri::command]
pub fn archive_folder(path: String) -> Result<(), Error> {
    Ok(())
}

#[tauri::command]
pub fn extract_archive(path: String) -> Result<(), Error> {
    Ok(())
}
