use image::{ImageBuffer, Rgb};
use std::io::Read;
use std::path::Path;

use minimp3::{Decoder, Frame};

pub fn generate_waveform(path: &Path) -> Result<ImageBuffer<Rgb<u8>, Vec<u8>>, String> {
    let extension = path
        .extension()
        .unwrap_or_default()
        .to_string_lossy()
        .to_lowercase();

    let mut samples: Vec<f32> = vec![];

    if extension == "wav" {
        let mut reader = hound::WavReader::open(path).map_err(|e| e.to_string())?;
        samples = reader
            .samples::<i16>()
            .map(|s| s.map(f32::from).unwrap_or(0.0))
            .collect();
    } else if extension == "mp3" {
        let mp3_samples = read_mp3_samples(path.to_str().ok_or("Invalid path")?)?;
        samples = mp3_samples.iter().map(|&s| f32::from(s)).collect();
    } else {
        return Err("Unsupported audio format".to_string());
    }

    // Normalize samples
    let max_sample = samples.iter().copied().fold(f32::MIN, f32::max).abs();
    for sample in &mut samples {
        *sample /= max_sample;
    }

    // Create an image buffer
    let width = 800;
    let height = 200;
    let mut img = ImageBuffer::new(width, height);

    let sample_count = samples.len();
    let samples_per_pixel = sample_count / width as usize;

    for x in 0..width {
        let start = x as usize * samples_per_pixel;
        let end = (x as usize + 1) * samples_per_pixel;
        let slice = &samples[start..end];

        let min = slice.iter().copied().fold(f32::INFINITY, f32::min);
        let max = slice.iter().copied().fold(f32::NEG_INFINITY, f32::max);

        let y_min = ((1.0 + min) * 0.5 * (height as f32)) as u32;
        let y_max = ((1.0 + max) * 0.5 * (height as f32)) as u32;

        for y in y_min..=y_max {
            if y < height {
                img.put_pixel(x, height - y - 1, Rgb([255, 255, 255]));
            }
        }
    }

    Ok(img)
}

pub fn read_mp3_samples(file_path: &str) -> Result<Vec<i16>, String> {
    let mut file = std::fs::File::open(file_path).map_err(|e| e.to_string())?;
    let mut mp3_data = Vec::new();
    file.read_to_end(&mut mp3_data).map_err(|e| e.to_string())?;

    let mut decoder = Decoder::new(mp3_data.as_slice());
    let mut samples = Vec::new();

    loop {
        match decoder.next_frame() {
            Ok(Frame { data, .. }) => {
                samples.extend_from_slice(&data);
            }
            Err(minimp3::Error::Eof) => break,
            Err(e) => return Err(e.to_string()),
        }
    }

    Ok(samples)
}
