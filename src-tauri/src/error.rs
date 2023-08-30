#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error(transparent)]
    Io(#[from] std::io::Error),
    #[error("{0}")]
    Custom(String),
}

#[derive(Debug, thiserror::Error)]
pub enum GitError {
    #[error("Failed to open repository: {0}")]
    OpenRepoError(git2::Error),
    #[error("Failed to create signature: {0}")]
    SignatureError(git2::Error),
    #[error("Failed to stash: {0}")]
    StashError(git2::Error),
    #[error("Failed to fetch config: {0}")]
    ConfigError(git2::Error),
    #[error("User signature not found in config")]
    SignatureNotFound,
}

impl serde::Serialize for GitError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::ser::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}

impl serde::Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::ser::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}
