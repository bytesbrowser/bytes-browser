use std::fs::{self, File};
use std::io::{self, Read, Write};
use std::path::Path;
use walkdir::WalkDir;
use zip::write::FileOptions;

use crate::error::Error;

#[tauri::command]
pub fn archive_folder(path: String) -> Result<(), Error> {
    let path = Path::new(&path);
    let file = File::create(path).unwrap();

    let walkdir = WalkDir::new(&path);
    let it = walkdir.into_iter().filter_map(|e| e.ok());

    let mut zip = zip::ZipWriter::new(file);
    let options = FileOptions::default().unix_permissions(0o755);

    let mut buffer = Vec::new();

    for entry in it {
        let path = entry.path();
        let name = path.strip_prefix(Path::new(&path)).unwrap();

        if path.is_file() {
            println!("adding file {path:?} as {name:?} ...");
            #[allow(deprecated)]
            match zip.start_file_from_path(name, options) {
                Ok(mut _file) => {
                    let mut f = match File::open(path) {
                        Ok(f) => f,
                        Err(e) => {
                            println!("Error: {:?}", e);
                            continue;
                        }
                    };

                    f.read_to_end(&mut buffer)?;

                    match f.write_all(&buffer) {
                        Ok(_) => {}
                        Err(e) => {
                            println!("Error: {:?}", e);
                        }
                    };

                    buffer.clear();
                }
                Err(e) => {
                    println!("Error: {:?}", e);
                }
            };
        } else if !name.as_os_str().is_empty() {
            #[allow(deprecated)]
            match zip.add_directory_from_path(name, options) {
                Ok(_) => {}
                Err(e) => {
                    println!("Error: {:?}", e);
                }
            };
        }
    }

    Ok(())
}

#[tauri::command]
pub fn extract_archive(path: String) -> Result<(), Error> {
    let file = File::open(&path).unwrap();

    let mut archive = zip::ZipArchive::new(file).unwrap();

    for i in 0..archive.len() {
        let mut file = archive.by_index(i).unwrap();
        let outpath = match file.enclosed_name() {
            Some(path) => path.to_owned(),
            None => continue,
        };

        {
            let comment = file.comment();
            if !comment.is_empty() {
                println!("File {i} comment: {comment}");
            }
        }

        if (*file.name()).ends_with('/') {
            println!("File {} extracted to \"{}\"", i, outpath.display());
            fs::create_dir_all(&outpath).unwrap();
        } else {
            println!(
                "File {} extracted to \"{}\" ({} bytes)",
                i,
                outpath.display(),
                file.size()
            );
            if let Some(p) = outpath.parent() {
                if !p.exists() {
                    fs::create_dir_all(p).unwrap();
                }
            }
            let mut outfile = File::create(&outpath).unwrap();
            io::copy(&mut file, &mut outfile).unwrap();
        }

        // Get and Set permissions
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;

            if let Some(mode) = file.unix_mode() {
                fs::set_permissions(&outpath, fs::Permissions::from_mode(mode)).unwrap();
            }
        }
    }

    Ok(())
}
