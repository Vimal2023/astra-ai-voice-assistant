"""
app/core/config.py
──────────────────
Centralised settings loaded from the .env file via Pydantic-Settings.
Every module that needs a config value should import `settings` from here.
"""

from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ── Groq / LLM ──────────────────────────────────────────────────────
    groq_api_key: str
    groq_model: str = "llama3-8b-8192"

    # ── CORS ────────────────────────────────────────────────────────────
    # Must be a JSON array in the .env file, e.g.:
    #   ALLOWED_ORIGINS=["http://localhost:3000","http://localhost:5173"]
    allowed_origins: List[str] = ["http://localhost:3000", "http://localhost:5173"]

    # ── Server ──────────────────────────────────────────────────────────
    host: str = "0.0.0.0"
    port: int = 8000

    # ── Pydantic-Settings config ─────────────────────────────────────────
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


@lru_cache
def get_settings() -> Settings:
    """Return a cached singleton of Settings."""
    return Settings()


# Convenience singleton used throughout the app
settings: Settings = get_settings()
