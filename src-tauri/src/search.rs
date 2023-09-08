use crate::filesystem::get_file_description;
use crate::CachedPath;
use crate::{filesystem::volume::DirectoryChild, StateSafe};
use fuzzy_matcher::skim::SkimMatcherV2;
use fuzzy_matcher::FuzzyMatcher;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
// use std::os::windows::prelude::MetadataExt;
use std::path::Path;
use std::time::Instant;
use tauri::State;

#[cfg(target_os = "windows")]
use std::os::windows::fs::MetadataExt;

const MINIMUM_SCORE: i16 = 20;

const FILTERED_STRINGS: [&str; 3] = ["$$_systemapps_", "shared.index", "com."]; // Replace with the actual strings you want

// Function to tokenize a filename (simplified example)
fn tokenize(filename: &str) -> Vec<String> {
    let mut tokens = Vec::new();
    let mut token_start = 0;
    let chars: Vec<char> = filename.chars().collect();

    let mut prev_char_type = CharType::Other;

    for (i, c) in chars.iter().enumerate() {
        let char_type = if c.is_alphabetic() {
            if c.is_uppercase() {
                CharType::Uppercase
            } else {
                CharType::Lowercase
            }
        } else if c.is_numeric() {
            CharType::Numeric
        } else {
            CharType::Other
        };

        if i != 0 {
            match (prev_char_type, char_type) {
                (CharType::Uppercase | CharType::Numeric, CharType::Lowercase)
                | (CharType::Lowercase, CharType::Uppercase | CharType::Numeric)
                | (CharType::Other, _)
                | (_, CharType::Other) => {
                    if token_start < i {
                        let token: String = chars[token_start..i].iter().collect();
                        tokens.push(token.to_lowercase());
                    }
                    token_start = i;
                }
                _ => {}
            }
        }
        prev_char_type = char_type;
    }

    // Add last token
    if token_start < chars.len() {
        let token: String = chars[token_start..].iter().collect();
        tokens.push(token.to_lowercase());
    }

    tokens
}

#[derive(Copy, Clone)]
enum CharType {
    Uppercase,
    Lowercase,
    Numeric,
    Other,
}

// Function to build a token index
pub fn build_token_index(
    system_cache: &HashMap<String, Vec<CachedPath>>,
) -> HashMap<String, Vec<String>> {
    let mut token_index = HashMap::new();

    for (filename, _) in system_cache.iter() {
        let tokens = tokenize(filename);
        for token in tokens {
            token_index
                .entry(token)
                .or_insert_with(Vec::new)
                .push(filename.clone());
        }
    }

    token_index
}

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

    let has_extension_in_query = query.contains('.');
    let extension = query.split('.').last().unwrap_or_default();

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

    let metadata = match fs::metadata(file_path) {
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
    let last_modified_sys_time = fs::metadata(file_path).unwrap().modified();

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
    _mount_pnt: String,
    accept_files: bool,
    accept_directories: bool,
) -> Result<SearchResult, ()> {
    let start_time = Instant::now();

    let state = state_mux.lock().unwrap();

    // Tokenize the query and find matching filenames
    let query_tokens = tokenize(&query);
    let mut candidate_files = Vec::new();

    for token in query_tokens {
        if let Some(filenames) = state.token_cache.get(&token) {
            println!("Found token: {token}");
            candidate_files.extend(filenames);
        }
    }

    candidate_files.sort();
    candidate_files.dedup(); // Remove duplicates

    // Now candidate_files contains filenames that might be a match.
    // You can now proceed to score them using your existing logic.
    let mut results: Vec<_> = Vec::new();
    let mut fuzzy_scores: Vec<i16> = Vec::new();
    let matcher = SkimMatcherV2::default().smart_case();

    let query = query.to_lowercase();

    let mut results_exceeded = false; // this flag will indicate whether the results exceeded the threshold

    let mut combined_cache: HashMap<String, Vec<&CachedPath>> = HashMap::new();

    // let system_cache = state.system_cache.get(&mount_pnt).unwrap();

    for (_, volume) in &state.system_cache {
        for (file_type, cached_paths) in volume.iter() {
            for cached_path in cached_paths.iter() {
                combined_cache
                    .entry(file_type.clone())
                    .or_insert_with(Vec::new)
                    .push(cached_path.clone());
            }
        }
    }

    'outer: for filename in &candidate_files {
        let paths = match combined_cache.get(*filename) {
            Some(p) => p,
            None => continue,
        };

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

                if results.len() >= 250 {
                    println!("Over limit");
                    results_exceeded = true; // set the flag to true
                    break 'outer; // this will break out of both loops
                }

                continue;
            }

            if !accept_directories {
                continue;
            }

            let score = score_filename(&matcher, filename, &query);
            if score < MINIMUM_SCORE {
                continue;
            }

            let metadata = match fs::metadata(file_path) {
                Ok(meta) => meta,
                Err(_) => continue,
            };

            let size = metadata.len();
            let last_modified_sys_time = fs::metadata(file_path).unwrap().modified();

            let last_modified = last_modified_sys_time.unwrap().elapsed().unwrap().as_secs();

            let extension = filename_path
                .extension()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();

            let file_type = get_file_description(&extension);

            results.push(DirectoryChild::Directory(
                (*filename).to_string(),
                file_path.to_string(),
                size,
                last_modified,
                file_type.to_string(),
                // We don't care in the search results
                false,
            ));
            fuzzy_scores.push(score);

            if results.len() >= 250 {
                println!("Over limit");
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
