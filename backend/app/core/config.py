from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database (SQLite by default, can be overridden with PostgreSQL URL)
    database_url: str = "sqlite:///./doctor_roster.db"

    # Application
    app_env: str = "development"
    debug: bool = True
    secret_key: str = "dev-secret-key-not-for-production"

    # CORS
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    return Settings()
