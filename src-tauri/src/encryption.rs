use aes::cipher::{AsyncStreamCipher, KeyIvInit};
use aes::Aes256;
use cfb8;
use std::fs::File;
use std::io::{Read, Write};

use crate::error::Error;

pub type Aes256Enc = cfb8::Encryptor<Aes256>;
pub type Aes256Dec = cfb8::Decryptor<Aes256>;

const ENC_MAGIC_NUMBER: &[u8] = b"BYTESENCRYPTED";

#[tauri::command]
pub fn encrypt_file(source_file_path: &str, key: &[u8], iv: &[u8]) -> Result<(), Error> {
    if key.len() != 32 {
        return Err(Error::Custom("Invalid key length".to_string()));
    }
    if iv.len() != 16 {
        return Err(Error::Custom("Invalid IV length".to_string()));
    }

    let mut file = match File::open(&source_file_path).map_err(|e| e.to_string()) {
        Ok(file) => file,
        Err(e) => {
            return Err(Error::Custom(e.to_string()));
        }
    };

    let mut data = Vec::new();

    match file.read_to_end(&mut data).map_err(|e| e.to_string()) {
        Ok(_) => {}
        Err(e) => {
            return Err(Error::Custom(e.to_string()));
        }
    };

    let cipher = Aes256Enc::new(key.into(), iv.into());

    let mut encrypted_data = data.clone();
    cipher.encrypt(&mut encrypted_data);

    let mut encrypted_data_with_magic = ENC_MAGIC_NUMBER.to_vec();
    encrypted_data_with_magic.extend_from_slice(&encrypted_data);

    let mut output = match File::create(&source_file_path).map_err(|e| e.to_string()) {
        Ok(file) => file,
        Err(e) => {
            return Err(Error::Custom(e.to_string()));
        }
    };

    match output
        .write_all(&encrypted_data_with_magic)
        .map_err(|e| e.to_string())
    {
        Ok(_) => {}
        Err(e) => {
            return Err(Error::Custom(e.to_string()));
        }
    };

    Ok(())
}

#[tauri::command]
pub fn decrypt_file(source_file_path: &str, key: &[u8], iv: &[u8]) -> Result<(), Error> {
    if key.len() != 32 {
        return Err(Error::Custom("Invalid key length".to_string()));
    }
    if iv.len() != 16 {
        return Err(Error::Custom("Invalid IV length".to_string()));
    }

    let mut file = match File::open(&source_file_path).map_err(|e| e.to_string()) {
        Ok(file) => file,
        Err(e) => {
            return Err(Error::Custom(e.to_string()));
        }
    };

    let mut encrypted_data = Vec::new();

    match file
        .read_to_end(&mut encrypted_data)
        .map_err(|e| e.to_string())
    {
        Ok(_) => {}
        Err(e) => {
            return Err(Error::Custom(e.to_string()));
        }
    };

    if encrypted_data.starts_with(ENC_MAGIC_NUMBER) {
        encrypted_data = encrypted_data[ENC_MAGIC_NUMBER.len()..].to_vec();
    }

    let cipher = Aes256Dec::new(key.into(), iv.into());

    let mut decrypted_data = encrypted_data.clone();
    cipher.decrypt(&mut decrypted_data);

    let mut file = match File::create(&source_file_path).map_err(|e| e.to_string()) {
        Ok(file) => file,
        Err(e) => {
            return Err(Error::Custom(e.to_string()));
        }
    };

    match file.write_all(&decrypted_data).map_err(|e| e.to_string()) {
        Ok(_) => {}
        Err(e) => {
            return Err(Error::Custom(e.to_string()));
        }
    };

    Ok(())
}

#[tauri::command]
pub fn is_file_encrypted(file_path: &str) -> Result<bool, Error> {
    let metadata = std::fs::metadata(file_path)?;
    if metadata.len() < ENC_MAGIC_NUMBER.len() as u64 {
        return Ok(false);
    }

    let mut file = std::fs::File::open(file_path)?;

    let mut buffer = vec![0; ENC_MAGIC_NUMBER.len()];
    file.read_exact(&mut buffer)?;

    Ok(buffer == ENC_MAGIC_NUMBER)
}
