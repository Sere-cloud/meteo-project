from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./meteo_app.db"
    SECRET_KEY: str   = "meteo_cameroun_secret_key_2025_changez_en_prod"
    ALGORITHM: str    = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    ADMIN_USERNAME: str = "admin"
    ADMIN_EMAIL: str    = "admin@meteo-cameroun.cm"
    ADMIN_PASSWORD: str = "Admin@2025!"

    # URL du frontend (pour le lien de réinitialisation)
    FRONTEND_URL: str = "http://localhost:5173"

    # Gmail SMTP — laisser vide en développement (lien affiché dans le terminal)
    GMAIL_USER: Optional[str]         = None
    GMAIL_APP_PASSWORD: Optional[str] = None

    class Config:
        env_file = ".env"

settings = Settings()