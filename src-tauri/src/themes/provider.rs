use serde_json::Value;
use std::{
    fs,
    time::{SystemTime, UNIX_EPOCH},
};

use super::THEMES_FILE_PATH;

#[tauri::command]
pub async fn get_installed_themes() -> Result<Vec<String>, String> {
    let themes_dir = &*THEMES_FILE_PATH;

    // Check if the directory exists
    if !fs::metadata(themes_dir).is_ok() {
        return Err(format!("Directory {} does not exist", themes_dir));
    }

    let entries = fs::read_dir(themes_dir).map_err(|e| e.to_string())?;

    let mut theme_names = Vec::new();

    for entry in entries {
        if let Ok(entry) = entry {
            // Check if the file is a JSON file
            if let Some(ext) = entry.path().extension() {
                if ext == "json" {
                    // Read the JSON file
                    let file_content =
                        fs::read_to_string(entry.path()).map_err(|e| e.to_string())?;
                    let json: Value =
                        serde_json::from_str(&file_content).map_err(|e| e.to_string())?;

                    // Extract the theme-name field
                    if let Some(theme_name) = json["theme-name"].as_str() {
                        theme_names.push(theme_name.to_string());
                    }
                }
            }
        }
    }

    Ok(theme_names)
}

#[tauri::command]
pub async fn install_theme(json: String) -> Result<Vec<String>, String> {
    let themes_dir = &*THEMES_FILE_PATH;

    // Create the directory if it doesn't exist
    if !fs::metadata(themes_dir).is_ok() {
        fs::create_dir_all(themes_dir).map_err(|e| e.to_string())?;
    }

    // Generate a file name based on the current timestamp
    let start = SystemTime::now();
    let since_the_epoch = start
        .duration_since(UNIX_EPOCH)
        .expect("Time went backwards");
    let file_name = format!("theme-{}.json", since_the_epoch.as_secs());

    // Create the full path for the new theme file
    let file_path = format!("{}/{}", themes_dir, file_name);

    // Write the JSON string to the file
    fs::write(file_path, json).map_err(|e| e.to_string())?;

    let themes = match get_installed_themes().await {
        Ok(themes) => themes,
        Err(e) => return Err(e),
    };

    Ok(themes)
}

#[tauri::command]
pub async fn remove_theme(theme_name_to_remove: String) -> Result<(), String> {
    let themes_dir = &*THEMES_FILE_PATH;

    // Check if the directory exists
    if !fs::metadata(&themes_dir).is_ok() {
        return Err(format!("Directory {} does not exist", themes_dir));
    }

    // Read the directory
    let entries = fs::read_dir(&themes_dir).map_err(|e| e.to_string())?;

    for entry in entries {
        if let Ok(entry) = entry {
            // Check if the file is a JSON file
            if let Some(ext) = entry.path().extension() {
                if ext == "json" {
                    // Read the JSON file
                    let file_content =
                        fs::read_to_string(&entry.path()).map_err(|e| e.to_string())?;
                    let json: Value =
                        serde_json::from_str(&file_content).map_err(|e| e.to_string())?;

                    // Check the theme-name field
                    if let Some(theme_name) = json["theme-name"].as_str() {
                        if theme_name == theme_name_to_remove {
                            // Delete the file
                            fs::remove_file(entry.path()).map_err(|e| e.to_string())?;
                            return Ok(());
                        }
                    }
                }
            }
        }
    }

    Err(format!(
        "Theme with name {} not found",
        theme_name_to_remove
    ))
}

#[tauri::command]
pub async fn get_theme_by_name(theme_name_to_find: String) -> Result<String, String> {
    let themes_dir = &*THEMES_FILE_PATH;

    // Check if the directory exists
    if !fs::metadata(&themes_dir).is_ok() {
        return Err(format!("Directory {} does not exist", themes_dir));
    }

    // Read the directory
    let entries = fs::read_dir(&themes_dir).map_err(|e| e.to_string())?;

    for entry in entries {
        if let Ok(entry) = entry {
            // Check if the file is a JSON file
            if let Some(ext) = entry.path().extension() {
                if ext == "json" {
                    // Read the JSON file
                    let file_content =
                        fs::read_to_string(&entry.path()).map_err(|e| e.to_string())?;
                    let json: Value =
                        serde_json::from_str(&file_content).map_err(|e| e.to_string())?;

                    // Check the theme-name field
                    if let Some(theme_name) = json["theme-name"].as_str() {
                        if theme_name == theme_name_to_find {
                            return Ok(file_content);
                        }
                    }
                }
            }
        }
    }

    Err(format!("Theme with name {} not found", theme_name_to_find))
}
