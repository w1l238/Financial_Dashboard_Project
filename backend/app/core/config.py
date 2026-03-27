from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional, Any
from dotenv import load_dotenv
import json as _json

# Pre-load .env for any os.getenv calls if needed, 
# although BaseSettings handles it via model_config
load_dotenv()


class Settings(BaseSettings):
    """
    Application settings and environment variables.
    Utilizes Pydantic's BaseSettings for validation and automatic parsing.
    """
    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8', extra='ignore')

    APP_NAME: str = "Financial & Weather Dashboard API"
    VERSION: str = "0.1.0"
    
    # API Keys
    OPENWEATHER_API_KEY: Optional[str] = None
    
    # API Base URLs
    OPENWEATHER_BASE_URL: str = "https://api.openweathermap.org/data/2.5"

    # JWT Settings
    SECRET_KEY: str = "SUPER_SECRET_KEY_CHANGE_ME"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440 # 24 hours
    
    # Database Settings
    DATABASE_URL: str = "sqlite:///./financial_dashboard.db"

    # Security & CORS
    # Use Any to prevent pydantic-settings v2 from auto-JSON-decoding before the validator runs.
    # Accepts: "http://a.com,http://b.com"  OR  '["http://a.com"]'  OR an already-decoded list.
    ALLOWED_ORIGINS: Any = ["http://localhost:3000"]
    ENVIRONMENT: str = "development" # development or production

    # Registration
    ALLOW_REGISTRATION: bool = True

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Any) -> list[str]:
        if isinstance(v, list):
            return v
        if isinstance(v, str):
            v = v.strip()
            if v.startswith("["):
                return _json.loads(v)
            return [i.strip() for i in v.split(",") if i.strip()]
        return v

# Instantiate global settings object
settings = Settings()
