use lazy_static::lazy_static;

pub mod provider;

lazy_static! {
    pub static ref THEMES_FILE_PATH: String = {
        let mut themes_path = dirs::cache_dir().expect("Failed to get base cache path");
        themes_path.push(format!("{}-themes", env!("CARGO_PKG_NAME")));
        themes_path.to_string_lossy().to_string()
    };
}
