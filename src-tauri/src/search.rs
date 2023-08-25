use crate::filesystem::get_file_description;
use crate::{filesystem::volume::DirectoryChild, StateSafe};
use fuzzy_matcher::skim::SkimMatcherV2;
use fuzzy_matcher::FuzzyMatcher;
use serde::{Deserialize, Serialize};
use std::fs;
use std::os::windows::prelude::MetadataExt;
use std::path::Path;
use std::time::Instant;
use tauri::State;

const MINIMUM_SCORE: i16 = 20;

const FILTERED_STRINGS: [&str; 3] = ["$$_systemapps_", "shared.index", "com."]; // Replace with the actual strings you want

/// Gives a filename a fuzzy matcher score
/// Returns 1000 if there is an exact match for prioritizing
fn score_filename(matcher: &SkimMatcherV2, filename: &str, query: &str) -> i16 {
    if filename == query {
        return 1000;
    }
    matcher.fuzzy_match(filename, query).unwrap_or(0) as i16
}

fn check_file(
    matcher: &SkimMatcherV2,
    accept_files: bool,
    filename: &String,
    file_path: &String,
    query: String,
    results: &mut Vec<DirectoryChild>,
    fuzzy_scores: &mut Vec<i16>,
) {
    if !accept_files {
        return;
    }

    let filename_path = Path::new(filename);
    let cleaned_filename = filename_path
        .file_stem()
        .and_then(|stem| stem.to_str())
        .unwrap_or("");

    let has_extension_in_query = query.contains('.');
    let extension = query.split('.').last().unwrap_or_default();

    let file_extension = filename_path
        .extension()
        .unwrap_or_default()
        .to_string_lossy()
        .to_lowercase();

    for filter in &FILTERED_STRINGS {
        if filename.contains(filter) {
            return;
        }
    }

    if has_extension_in_query {
        let file_extension = filename_path
            .extension()
            .unwrap_or_default()
            .to_string_lossy()
            .to_lowercase();
        if file_extension != extension.to_lowercase() {
            return;
        }
    }

    let score = score_filename(matcher, filename.as_str(), query.as_str());

    if score < MINIMUM_SCORE {
        return;
    }

    let metadata = match fs::metadata(&file_path) {
        Ok(meta) => meta,
        Err(_) => return,
    };

    #[cfg(target_family = "windows")]
    let is_hidden = {
        let attributes = metadata.file_attributes();
        attributes & 0x2 != 0
    };

    #[cfg(target_family = "unix")]
    let is_hidden = filename.starts_with('.');

    if is_hidden {
        return;
    }

    let size = metadata.len();
    let last_modified_sys_time = fs::metadata(&file_path).unwrap().modified();

    let last_modified = last_modified_sys_time.unwrap().elapsed().unwrap().as_secs();

    let extension = filename_path
        .extension()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();

    let file_type = get_file_description(&extension);

    results.push(DirectoryChild::File(
        filename.to_string(),
        file_path.to_string(),
        size,
        last_modified,
        file_type.to_string(),
    ));
    fuzzy_scores.push(score);
}

#[derive(Serialize, Deserialize)]
pub struct SearchResult {
    results: Vec<DirectoryChild>,
    more: bool,
}

/// Reads the cache and does a fuzzy search for a directory.
/// Takes into account the filters provided.
/// Returns the results ONLY when the entire volume is searched
#[tauri::command]
pub async fn search_directory(
    state_mux: State<'_, StateSafe>,
    query: String,
    mount_pnt: String,
    accept_files: bool,
    accept_directories: bool,
) -> Result<SearchResult, ()> {
    let start_time = Instant::now();

    let mut results: Vec<_> = Vec::new();
    let mut fuzzy_scores: Vec<i16> = Vec::new();
    let matcher = SkimMatcherV2::default().smart_case();

    let state = state_mux.lock().unwrap();
    let query = query.to_lowercase();

    let mut results_exceeded = false; // this flag will indicate whether the results exceeded the threshold

    let system_cache = state.system_cache.get(&mount_pnt).unwrap();
    'outer: for (filename, paths) in system_cache {
        for path in paths {
            let file_type = &path.file_type;
            let file_path = &path.file_path;

            let filename_path = Path::new(filename);

            if file_type == "file" {
                check_file(
                    &matcher,
                    accept_files,
                    filename,
                    file_path,
                    query.clone(),
                    &mut results,
                    &mut fuzzy_scores,
                );

                continue;
            }

            if !accept_directories {
                continue;
            }

            let score = score_filename(&matcher, filename, &query);
            if score < MINIMUM_SCORE {
                continue;
            }

            let metadata = match fs::metadata(&file_path) {
                Ok(meta) => meta,
                Err(_) => continue,
            };

            let size = metadata.len();
            let last_modified_sys_time = fs::metadata(&file_path).unwrap().modified();

            let last_modified = last_modified_sys_time.unwrap().elapsed().unwrap().as_secs();

            let extension = filename_path
                .extension()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();

            let file_type = get_file_description(&extension);

            results.push(DirectoryChild::Directory(
                filename.to_string(),
                file_path.to_string(),
                size,
                last_modified,
                file_type.to_string(),
            ));
            fuzzy_scores.push(score);

            if results.len() >= 10000 {
                results_exceeded = true; // set the flag to true
                break 'outer; // this will break out of both loops
            }
        }
    }

    let end_time = Instant::now();
    println!("Elapsed time: {:?}", end_time - start_time);

    // Sort by best match first.
    let mut tuples: Vec<(usize, _)> = fuzzy_scores.iter().enumerate().collect();
    tuples.sort_by(|a, b| b.1.cmp(a.1));

    Ok(SearchResult {
        results: tuples
            .into_iter()
            .map(|(index, _)| results[index].clone())
            .collect(),
        more: results_exceeded,
    })
}
