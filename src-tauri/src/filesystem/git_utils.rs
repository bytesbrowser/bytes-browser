use std::{collections::HashMap, fs, path::Path};

use git2::{Config, Signature};

use crate::error::GitError;

use super::explorer::GitResult;

pub fn get_home_dir() -> Option<String> {
    dirs::home_dir().map(|path| path.to_string_lossy().to_string())
}

pub async fn get_user_git_config_signature() -> GitResult<Signature<'static>> {
    let cfg = Config::open_default().map_err(GitError::ConfigError)?;
    let name = cfg
        .get_string("user.name")
        .map_err(|_| GitError::SignatureNotFound)?;
    let email = cfg
        .get_string("user.email")
        .map_err(|_| GitError::SignatureNotFound)?;

    let signature = Signature::now(&name, &email).map_err(GitError::SignatureError)?;

    Ok(signature)
}

fn get_git_creds() -> HashMap<String, Vec<String>> {
    let mut creds = HashMap::new();

    if let Some(home_dir) = get_home_dir() {
        // Check for SSH keys in the ~/.ssh directory
        let ssh_path = format!("{}/.ssh", home_dir);
        let ssh_dir = Path::new(&ssh_path);

        if ssh_dir.is_dir() {
            match fs::read_dir(ssh_dir) {
                Ok(entries) => {
                    let mut ssh_keys = Vec::new();
                    for entry in entries {
                        if let Ok(entry) = entry {
                            let path = entry.path();
                            if let Some(filename) = path.file_name() {
                                if let Some(filename_str) = filename.to_str() {
                                    if filename_str.starts_with("id_") {
                                        ssh_keys.push(filename_str.to_string());
                                    }
                                }
                            }
                        }
                    }
                    if !ssh_keys.is_empty() {
                        creds.insert("SSH Keys".to_string(), ssh_keys);
                    }
                }
                Err(_) => {
                    println!("Could not read the .ssh directory.");
                }
            }
        }
    } else {
        println!("Could not determine the home directory.");
    }

    creds
}
