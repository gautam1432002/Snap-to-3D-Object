"""
app/main.py
───────────
FastAPI application entrypoint with lifespan events, CORS, and API routing.
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router as api_router
from app.core.config import get_settings
from app.db.database import init_db

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("foldly")


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    logger.info("Initializing Foldly API backend...")

    # Ensure storage folder exists
    storage = Path(settings.STORAGE_PATH)
    storage.mkdir(parents=True, exist_ok=True)
    logger.info("Storage directory ready: %s", storage.resolve())

    # Initialize SQLite database schema
    await init_db()

    yield

    logger.info("Shutting down Foldly API backend.")


app = FastAPI(
    title="Foldly 3D Papercraft Studio API",
    description="Backend API powering photo-to-3D papercraft processing, AI outpainting, and flat-pack assembly generation.",
    version="1.0.0",
    lifespan=lifespan,
)

settings = get_settings()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)
