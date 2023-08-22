use crate::DBSafe;
use bcrypt::{hash, verify, DEFAULT_COST};
use jsonwebtoken::{encode, EncodingKey, Header};
use mongodb::bson::doc;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize)]
struct Claims {
    sub: String,
}

pub struct AccountCreationError {
    pub message: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct NewUserParams {
    pub full_name: String,
    pub avatar: String,
    pub password: String,
    pub email: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct User {
    pub full_name: String,
    pub avatar: String,
    pub password: String,
    pub email: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct LoginParams {
    pub email: String,
    pub password: String,
}

fn hash_password(password: &str) -> Result<String, bcrypt::BcryptError> {
    // The "4" here is the cost, or the computational complexity. Adjust as needed (12-14 is typical).
    bcrypt::hash(password, 4)
}

fn verify_password(password: &str, hash: &str) -> Result<bool, bcrypt::BcryptError> {
    bcrypt::verify(password, hash)
}

fn create_token(user: &NewUserParams) -> String {
    let claims = Claims {
        sub: user.email.clone(),
        // Add more claims based on your NewUserParams structure or your needs
    };

    let secret = "your_secret"; // WARNING: Do not hard-code in production! Store in an environment variable or secret manager.

    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_ref()),
    )
    .expect("Failed to create token"); // Handle this properly in production

    token
}

#[tauri::command]
pub async fn create_account(
    db_state: State<'_, DBSafe>,
    new_user: NewUserParams,
) -> Result<String, ()> {
    let client = {
        let guard = db_state.lock().unwrap();
        guard.clone()
    };

    let db = client.database("admin");

    let maybe_existing_account = db
        .collection::<User>("accounts")
        .find(doc! {"email": &new_user.email}, None)
        .await
        .unwrap();

    if maybe_existing_account.current().is_empty() {
        let cloned_user = new_user.clone();

        let new_account = User {
            full_name: cloned_user.full_name,
            avatar: cloned_user.avatar,
            password: hash_password(&cloned_user.password).unwrap(),
            email: cloned_user.email,
        };

        db.collection::<User>("accounts")
            .insert_one(new_account, None)
            .await
            .unwrap();
    } else {
        return Err(());
    }

    let token = create_token(&new_user);

    Ok(token)
}

#[tauri::command]
pub async fn login(db_state: State<'_, DBSafe>, params: LoginParams) -> Result<String, ()> {
    let client = {
        let guard = db_state.lock().unwrap();
        guard.clone()
    };

    let db = client.database("admin");

    let maybe_existing_account = db
        .collection::<User>("accounts")
        .find(doc! {"email": &params.email}, None)
        .await
        .unwrap();

    if maybe_existing_account.current().is_empty() {
        return Err(());
    }

    let password_correct = verify_password(
        &params.password,
        &maybe_existing_account
            .deserialize_current()
            .unwrap()
            .password,
    );

    if !password_correct.unwrap() {
        return Err(());
    }

    let token = create_token(&NewUserParams {
        full_name: "".to_string(),
        avatar: "".to_string(),
        password: params.password,
        email: params.email,
    });

    Ok(token)
}
