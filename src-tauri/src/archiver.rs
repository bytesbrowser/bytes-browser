use std::fs::{self, File};
use std::io::{self, Read, Write};
use std::path::Path;
use walkdir::WalkDir;
use zip::write::FileOptions;
use zip::{CompressionMethod, ZipArchive, ZipWriter};

use crate::error::Error;

#[tauri::command]
pub fn archive_folder(path: String) -> Result<(), Error> {
    let output_file = format!("{}-archive.zip", path);
    let file = File::create(&output_file)?;
    let mut zip = ZipWriter::new(file);
    let options = FileOptions::default()
        .compression_method(CompressionMethod::Stored)
        .unix_permissions(0o755);

    let base_path = Path::new(&path);

    for entry in WalkDir::new(&path) {
        let entry = match entry {
            Ok(entry) => entry,
            Err(_) => continue,
        };

        let path = entry.path();
        let name = match path.strip_prefix(base_path) {
            Ok(name) => name.to_path_buf(),
            Err(_) => continue,
        };

        if path.is_file() {
            match zip.start_file(
                name.to_string_lossy().as_ref().trim_start_matches('/'),
                options,
            ) {
                Ok(mut _file) => {
                    let mut f = File::open(path)?;
                    let mut buffer = Vec::new();
                    f.read_to_end(&mut buffer)?;
                    zip.write_all(&buffer)?;
                }
                Err(_) => continue,
            };
        } else if path.is_dir() {
            let dir_name = format!(
                "{}/",
                name.to_string_lossy().as_ref().trim_start_matches('/')
            );
            match zip.add_directory(&dir_name, options) {
                Ok(_) => {}
                Err(_) => continue,
            }
        }
    }

    match zip.finish() {
        Ok(_) => {}
        Err(_) => {}
    };
    Ok(())
}

#[tauri::command]
pub fn extract_archive(path: String) -> Result<(), Error> {
    let file = File::open(&path)?;
    let mut archive = match ZipArchive::new(file) {
        Ok(archive) => archive,
        Err(_) => return Err(Error::Custom("Failed to open archive".to_string())),
    };

    let extract_to = path.replace(".zip", ""); // Assuming the path ends with .zip
    for i in 0..archive.len() {
        let mut file = match archive.by_index(i) {
            Ok(file) => file,
            Err(_) => continue,
        };
        #[allow(deprecated)]
        let outpath = Path::new(&extract_to).join(file.sanitized_name());

        if (&*file.name()).ends_with('/') {
            fs::create_dir_all(&outpath)?;
        } else {
            if let Some(p) = outpath.parent() {
                if !p.exists() {
                    fs::create_dir_all(&p)?;
                }
            }
            let mut outfile = File::create(&outpath)?;
            io::copy(&mut file, &mut outfile)?;
        }
    }

    Ok(())
}
