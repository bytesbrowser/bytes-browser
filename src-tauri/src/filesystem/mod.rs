pub mod cache;
pub mod explorer;
pub mod volume;

pub const DIRECTORY: &str = "directory";
pub const FILE: &str = "file";

pub fn get_file_description(extension: &str) -> &'static str {
    match extension.to_lowercase().as_str() {
        "png" => "PNG image",
        "jpg" | "jpeg" => "JPEG image",
        "txt" => "Text file",
        "gif" => "GIF image",
        "bmp" => "Bitmap image",
        "pdf" => "PDF document",
        "doc" | "docx" => "Microsoft Word document",
        "xls" | "xlsx" => "Microsoft Excel spreadsheet",
        "ppt" | "pptx" => "Microsoft PowerPoint presentation",
        "mp3" => "MP3 audio",
        "wav" => "WAV audio",
        "mp4" => "MP4 video",
        "avi" => "AVI video",
        "zip" => "ZIP archive",
        "rar" => "RAR archive",
        "tar" => "Tarball archive",
        "7z" => "7-Zip archive",
        "html" | "htm" => "HTML document",
        "js" => "JavaScript file",
        "css" => "CSS file",
        "rs" => "Rust source file",
        "c" => "C source file",
        "cpp" => "C++ source file",
        "py" => "Python script",
        "go" => "Go source file",
        "java" => "Java source file",
        "md" => "Markdown document",
        "json" => "JSON file",
        "xml" => "XML file",
        "yml" | "yaml" => "YAML file",
        "toml" => "TOML file",
        "svg" => "SVG image",
        "ico" => "Icon",
        "exe" => "Executable",
        "app" => "Application",
        "bat" => "Batch file",
        "sh" => "Shell script",
        "ps1" => "PowerShell script",
        "ttf" => "TrueType font",
        "otf" => "OpenType font",
        "woff" => "Web Open Font Format (WOFF) font",
        "woff2" => "Web Open Font Format (WOFF2) font",
        "eot" => "Embedded OpenType font",
        "flac" => "FLAC audio",
        "ogg" => "Ogg audio",
        "webm" => "WebM video",
        "mkv" => "Matroska video",
        "mov" => "QuickTime video",
        "wmv" => "Windows Media Video",
        "mpg" | "mpeg" => "MPEG video",
        "m4v" => "M4V video",
        "m4a" => "M4A audio",
        "m4p" => "M4P audio",
        "m4b" => "M4B audio",
        "m4r" => "M4R audio",
        "3gp" => "3GP video",
        "3g2" => "3G2 video",
        "aac" => "AAC audio",
        "wma" => "Windows Media Audio",
        "webp" => "WebP image",
        "heic" => "HEIC image",
        "heif" => "HEIF image",
        "cr2" => "Canon Raw image",
        "nef" => "Nikon Raw image",
        "orf" => "Olympus Raw image",
        "arw" => "Sony Raw image",
        "rw2" => "Panasonic Raw image",
        "dng" => "Adobe Digital Negative image",
        "pef" => "Pentax Raw image",
        "srw" => "Samsung Raw image",
        "cr3" => "Canon Raw image",
        "nrw" => "Nikon Raw image",
        "rwl" => "Leica Raw image",
        "raf" => "Fuji Raw image",
        "x3f" => "Sigma Raw image",
        "erf" => "Epson Raw image",
        "kdc" => "Kodak Raw image",
        "mrw" => "Minolta Raw image",
        "dcr" => "Kodak Raw image",
        "mos" => "Leaf Raw image",
        "sr2" => "Sony Raw image",
        "srf" => "Sony Raw image",
        "3fr" => "Hasselblad Raw image",
        "fff" => "Hasselblad Raw image",
        "mef" => "Mamiya Raw image",
        "mdc" => "Minolta Raw image",
        "xmp" => "XMP file",
        "psd" => "Adobe Photoshop document",
        "ai" => "Adobe Illustrator document",
        "indd" => "Adobe InDesign document",
        "eps" => "Encapsulated PostScript file",
        "ps" => "PostScript file",
        "odt" => "OpenDocument Text document",
        _ => "Unknown file type",
    }
}

pub fn is_hidden(entry: &str) -> bool {
    entry.chars().next() == Some('.')
}
