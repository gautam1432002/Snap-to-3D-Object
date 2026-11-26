"""
app/core/config.py
─────────────────
All runtime settings are loaded strictly from environment variables / .env.
Never hardcode API keys or model names here.
"""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # ── Gemini ────────────────────────────────────────────────────────────────
    GEMINI_API_KEY: str = ""
    # Fix #3: defaults match the working models in PROJECT_SPEC.md
    GEMINI_TEXT_MODEL: str = "gemini-3-flash-preview"
    GEMINI_IMAGE_MODEL: str = "gemini-3.1-flash-image"

    # ── Storage ───────────────────────────────────────────────────────────────
    STORAGE_PATH: Path = Path("storage")
    DATABASE_URL: str = "sqlite+aiosqlite:///./foldly.db"

    # ── Upload limits ─────────────────────────────────────────────────────────
    MAX_UPLOAD_BYTES: int = 10 * 1024 * 1024  # 10 MB

    # ── CORS ──────────────────────────────────────────────────────────────────
    ALLOWED_ORIGINS: list[str] = ["*"]

    # ── Logging ───────────────────────────────────────────────────────────────
    LOG_LEVEL: str = "info"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
