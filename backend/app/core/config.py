import os
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database (SQLite by default, can be overridden with PostgreSQL URL)
    # For Vercel/production, use PostgreSQL (e.g., Supabase, Neon, or Vercel Postgres)
    database_url: str = "sqlite:///./doctor_roster.db"

    # Application
    app_env: str = "development"
    debug: bool = True
    secret_key: str = "dev-secret-key-not-for-production"

    # CORS - defaults include localhost and common Vercel domains
    cors_origins: str = "http://localhost:5173,http://localhost:3000,http://localhost:5174"

    @property
    def cors_origins_list(self) -> list[str]:
        origins = [origin.strip() for origin in self.cors_origins.split(",")]
        # In production, also allow the Vercel deployment URL
        vercel_url = os.getenv("VERCEL_URL")
        if vercel_url:
            origins.append(f"https://{vercel_url}")
        return origins

    @property
    def is_production(self) -> bool:
        return self.app_env == "production" or os.getenv("VERCEL") == "1"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    return Settings()
