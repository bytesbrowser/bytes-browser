use serde::{Deserialize, Serialize};
use std::{path::Path, process::Command as ProcessCommand};
use tokio::time::{sleep, Duration};

#[derive(Debug, Serialize, Deserialize)]
pub struct Command {
    name: String,
    commands: Vec<String>,
    description: String,
    time: u32,
    interval: String,
    mount_point: String,
    path: String,
    command_type: CommandRunType,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CommandRunEvent {
    command: String,
    error: bool,
    stdout: Option<String>,
    stderr: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum CommandRunType {
    Shell,
    Bash,
}

#[tauri::command]
pub fn run_command_once(command: Command, command_type: CommandRunType, window: tauri::Window) {
    let working_directory = std::path::Path::new(&command.mount_point).join(&command.path);

    let output = match command_type {
        CommandRunType::Shell => {
            ProcessCommand::new("sh")
                .current_dir(&working_directory) // Set the working directory
                .arg("-c")
                .arg(&command.commands.join(" "))
                .output()
        }
        CommandRunType::Bash => {
            ProcessCommand::new("bash")
                .current_dir(&working_directory) // Set the working directory
                .arg("-c")
                .arg(&command.commands.join(" "))
                .output()
        }
    };

    match output {
        Ok(output) => {
            let event = CommandRunEvent {
                command: command.name.clone(),
                error: !output.status.success(),
                stdout: Some(String::from_utf8_lossy(&output.stdout).into_owned()),
                stderr: Some(String::from_utf8_lossy(&output.stderr).into_owned()),
            };

            match window.emit("command-executed", event) {
                Ok(_) => {}
                Err(e) => {
                    eprintln!("Failed to emit command-executed-success: {}", e);
                }
            };
        }
        Err(e) => {
            eprintln!("Failed to run command: {}", e);
        }
    }
}

#[tauri::command]
pub async fn register_command(
    command: Command,
    command_type: CommandRunType,
    window: tauri::Window,
) {
    let duration = match command.interval.as_str() {
        "Minutes" => Duration::from_secs(command.time as u64 * 60),
        "Seconds" => Duration::from_secs(command.time as u64),
        "Milliseconds" => Duration::from_millis(command.time as u64),
        _ => {
            eprintln!("Invalid interval: {}", command.interval);
            return;
        }
    };

    loop {
        let working_directory = Path::new(&command.mount_point).join(&command.path);

        let output = match command_type {
            CommandRunType::Shell => ProcessCommand::new("sh")
                .current_dir(&working_directory)
                .arg("-c")
                .arg(&command.commands.join(" "))
                .output(),
            CommandRunType::Bash => ProcessCommand::new("bash")
                .current_dir(&working_directory)
                .arg("-c")
                .arg(&command.commands.join(" "))
                .output(),
        };

        match output {
            Ok(output) => {
                let event = CommandRunEvent {
                    command: command.name.clone(),
                    error: !output.status.success(),
                    stdout: Some(String::from_utf8_lossy(&output.stdout).into_owned()),
                    stderr: Some(String::from_utf8_lossy(&output.stderr).into_owned()),
                };

                match window.emit("command-executed", event) {
                    Ok(_) => {}
                    Err(e) => {
                        eprintln!("Failed to emit command-executed-success: {}", e);
                    }
                };
            }
            Err(e) => {
                eprintln!("Failed to run command: {}", e);
            }
        }

        sleep(duration).await;
    }
}

#[tauri::command]
pub fn check_bash_install() -> bool {
    let output = ProcessCommand::new("bash")
        .arg("-c")
        .arg("echo 'bash installed'")
        .output();

    match output {
        Ok(output) => String::from_utf8_lossy(&output.stdout).trim() == "bash installed",
        Err(_) => false,
    }
}

#[tauri::command]
pub fn check_npm_install() -> bool {
    let output = ProcessCommand::new("npm").arg("-v").output();

    match output {
        Ok(_) => true,
        Err(_) => false,
    }
}
