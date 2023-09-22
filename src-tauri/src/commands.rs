use serde::{Deserialize, Serialize};
use std::process::Command as ProcessCommand;
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
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CommandRunEvent {
    command: String,
    error: bool,
    stdout: Option<String>,
    stderr: Option<String>,
}

#[tauri::command]
pub async fn init_command(command: Command, window: tauri::Window) {
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
        for cmd_str in &command.commands {
            let adjusted_mount_point = if command.mount_point.ends_with('/') {
                command.mount_point.clone()
            } else {
                format!("{}/", &command.mount_point)
            };

            let adjusted_path = if command.path.starts_with('/') {
                command.path.clone()
            } else {
                format!("/{}", &command.path)
            };

            let full_command = format!(
                "cd {}{} && {}",
                adjusted_mount_point, adjusted_path, cmd_str
            );

            let output = ProcessCommand::new("bash")
                .arg("-c")
                .arg(&full_command)
                .output();

            match output {
                Ok(output) => {
                    if output.status.success() {
                        println!("Command {} executed successfully", cmd_str);

                        match window.emit(
                            "command-executed",
                            CommandRunEvent {
                                command: cmd_str.to_string(),
                                error: false,
                                stdout: match String::from_utf8(output.stdout) {
                                    Ok(stdout) => Some(stdout),
                                    Err(e) => Some(format!("Failed to parse stdout: {}", e)),
                                },
                                stderr: match String::from_utf8(output.stderr) {
                                    Ok(stderr) => Some(stderr),
                                    Err(e) => Some(format!("Failed to parse stderr: {}", e)),
                                },
                            },
                        ) {
                            Ok(_) => {}
                            Err(e) => {
                                eprintln!("Failed to emit command-executed-success: {}", e);
                            }
                        };
                    } else {
                        eprintln!("Failed to execute command: {}", cmd_str);
                        match window.emit(
                            "command-executed",
                            CommandRunEvent {
                                command: cmd_str.to_string(),
                                error: true,
                                stdout: match String::from_utf8(output.stdout) {
                                    Ok(stdout) => Some(stdout),
                                    Err(e) => Some(format!("Failed to parse stdout: {}", e)),
                                },
                                stderr: match String::from_utf8(output.stderr) {
                                    Ok(stderr) => Some(stderr),
                                    Err(e) => Some(format!("Failed to parse stderr: {}", e)),
                                },
                            },
                        ) {
                            Ok(_) => {}
                            Err(e) => {
                                eprintln!("Failed to emit command-executed-success: {}", e);
                            }
                        };
                    }
                }
                Err(e) => {
                    eprintln!("Failed to execute command: {}", e);
                    match window.emit(
                        "command-executed",
                        CommandRunEvent {
                            command: cmd_str.to_string(),
                            error: true,
                            stderr: Some(format!("Failed to execute command: {}", e)),
                            stdout: None,
                        },
                    ) {
                        Ok(_) => {}
                        Err(e) => {
                            eprintln!("Failed to emit command-executed-success: {}", e);
                        }
                    };
                }
            }
        }

        sleep(duration).await;
    }
}

#[tauri::command]
pub async fn run_command_once(command: Command, window: tauri::Window) {
    for cmd_str in &command.commands {
        let adjusted_mount_point = if command.mount_point.ends_with('/') {
            command.mount_point.clone()
        } else {
            format!("{}/", &command.mount_point)
        };

        let adjusted_path = if command.path.starts_with('/') {
            command.path.clone()
        } else {
            format!("/{}", &command.path)
        };

        let full_command = format!(
            "cd {}{} && {}",
            adjusted_mount_point, adjusted_path, cmd_str
        );

        let output = ProcessCommand::new("bash")
            .arg("-c")
            .arg(&full_command)
            .output();

        match output {
            Ok(output) => {
                if output.status.success() {
                    println!("Command {} executed successfully", cmd_str);
                    match window.emit(
                        "command-executed",
                        CommandRunEvent {
                            command: cmd_str.to_string(),
                            error: false,
                            stdout: match String::from_utf8(output.stdout) {
                                Ok(stdout) => Some(stdout),
                                Err(e) => Some(format!("Failed to parse stdout: {}", e)),
                            },
                            stderr: match String::from_utf8(output.stderr) {
                                Ok(stderr) => Some(stderr),
                                Err(e) => Some(format!("Failed to parse stderr: {}", e)),
                            },
                        },
                    ) {
                        Ok(_) => {}
                        Err(e) => {
                            eprintln!("Failed to emit command-executed-success: {}", e);
                        }
                    }
                } else {
                    eprintln!("Failed to execute command: {}", cmd_str);
                    match window.emit(
                        "command-executed",
                        CommandRunEvent {
                            command: cmd_str.to_string(),
                            error: true,
                            stdout: match String::from_utf8(output.stdout) {
                                Ok(stdout) => Some(stdout),
                                Err(e) => Some(format!("Failed to parse stdout: {}", e)),
                            },
                            stderr: match String::from_utf8(output.stderr) {
                                Ok(stderr) => Some(stderr),
                                Err(e) => Some(format!("Failed to parse stderr: {}", e)),
                            },
                        },
                    ) {
                        Ok(_) => {}
                        Err(e) => {
                            eprintln!("Failed to emit command-executed-success: {}", e);
                        }
                    }
                }
            }
            Err(e) => {
                eprintln!("Failed to execute command: {}", e);
                match window.emit(
                    "command-executed",
                    CommandRunEvent {
                        command: cmd_str.to_string(),
                        error: true,
                        stderr: Some(format!("Failed to execute command: {}", e)),
                        stdout: None,
                    },
                ) {
                    Ok(_) => {}
                    Err(e) => {
                        eprintln!("Failed to emit command-executed-success: {}", e);
                    }
                }
            }
        }
    }
}
