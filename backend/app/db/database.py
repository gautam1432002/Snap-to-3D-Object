"""
app/db/database.py
──────────────────
Raw aiosqlite database layer. No ORM — plain SQL with automatic safe schema migration.
"""
from __future__ import annotations

import json
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any, AsyncGenerator, Optional

import aiosqlite

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_DDL = """
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS projects (
    project_id          TEXT PRIMARY KEY,
    device_id           TEXT NOT NULL,
    original_filename   TEXT NOT NULL,
    original_path       TEXT NOT NULL,
    trimmed_path        TEXT,
    preview_path        TEXT,
    polished_path       TEXT,
    sheet_path          TEXT,
    status              TEXT NOT NULL DEFAULT 'queued',
    stage               TEXT NOT NULL DEFAULT 'uploaded',
    object_name         TEXT NOT NULL DEFAULT '',
    category            TEXT NOT NULL DEFAULT '',
    suggested_name      TEXT NOT NULL DEFAULT '',
    complexity          TEXT NOT NULL DEFAULT 'Medium',
    paper_size          TEXT NOT NULL DEFAULT 'A4',
    estimated_height_cm REAL NOT NULL DEFAULT 18.0,
    dominant_colors     TEXT NOT NULL DEFAULT '[]',
    quality_metrics     TEXT,
    contour             TEXT,
    engine_used         TEXT NOT NULL DEFAULT '',
    ai_source           TEXT NOT NULL DEFAULT 'fallback',
    ai_warning          TEXT,
    created_at          TEXT NOT NULL,
    updated_at          TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS jobs (
    job_id      TEXT PRIMARY KEY,
    project_id  TEXT NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
    stage       TEXT NOT NULL DEFAULT 'queued',
    status      TEXT NOT NULL DEFAULT 'queued',
    progress    INTEGER NOT NULL DEFAULT 0,
    error_msg   TEXT,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_jobs_project ON jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_projects_device ON projects(device_id);
"""

_MIGRATION_COLUMNS = {
    "engine_used": "TEXT NOT NULL DEFAULT ''",
    "ai_source": "TEXT NOT NULL DEFAULT 'fallback'",
    "ai_warning": "TEXT",
}


async def init_db() -> None:
    """Create tables if needed and apply safe additive column migrations."""
    settings = get_settings()
    db_path = str(settings.DATABASE_URL).replace("sqlite+aiosqlite:///", "")
    async with aiosqlite.connect(db_path) as db:
        await db.executescript(_DDL)
        cursor = await db.execute("PRAGMA table_info(projects)")
        existing_cols = {row[1] for row in await cursor.fetchall()}
        for col_name, col_def in _MIGRATION_COLUMNS.items():
            if col_name not in existing_cols:
                await db.execute(f"ALTER TABLE projects ADD COLUMN {col_name} {col_def}")
        await db.commit()
    logger.info("Database initialised at %s", db_path)


@asynccontextmanager
async def _open_db() -> AsyncGenerator[aiosqlite.Connection, None]:
    settings = get_settings()
    db_path = str(settings.DATABASE_URL).replace("sqlite+aiosqlite:///", "")
    async with aiosqlite.connect(db_path) as db:
        db.row_factory = aiosqlite.Row
        yield db


async def get_db() -> AsyncGenerator[aiosqlite.Connection, None]:
    async with _open_db() as db:
        yield db


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


async def create_project(db: aiosqlite.Connection, row: dict[str, Any]) -> None:
    now = _now()
    await db.execute(
        """
        INSERT INTO projects
            (project_id, device_id, original_filename, original_path,
             status, stage, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            row["project_id"], row["device_id"], row["original_filename"],
            row["original_path"], row.get("status", "queued"),
            row.get("stage", "uploaded"), now, now,
        ),
    )
    await db.commit()


async def get_project(
    db: aiosqlite.Connection, project_id: str, device_id: Optional[str] = None
) -> Optional[dict[str, Any]]:
    if device_id:
        cursor = await db.execute(
            "SELECT * FROM projects WHERE project_id=? AND device_id=?",
            (project_id, device_id),
        )
    else:
        cursor = await db.execute(
            "SELECT * FROM projects WHERE project_id=?", (project_id,)
        )
    row = await cursor.fetchone()
    return dict(row) if row else None


async def update_project(
    db: aiosqlite.Connection, project_id: str, fields: dict[str, Any]
) -> None:
    fields["updated_at"] = _now()
    set_clause = ", ".join(f"{k}=?" for k in fields)
    values = list(fields.values()) + [project_id]
    await db.execute(
        f"UPDATE projects SET {set_clause} WHERE project_id=?", values
    )
    await db.commit()


async def list_projects(
    db: aiosqlite.Connection, device_id: str, limit: int = 20, offset: int = 0
) -> tuple[list[dict[str, Any]], int]:
    cursor = await db.execute(
        "SELECT COUNT(*) FROM projects WHERE device_id=?", (device_id,)
    )
    total = (await cursor.fetchone())[0]
    cursor = await db.execute(
        "SELECT * FROM projects WHERE device_id=? ORDER BY created_at DESC LIMIT ? OFFSET ?",
        (device_id, limit, offset),
    )
    rows = [dict(r) for r in await cursor.fetchall()]
    return rows, total


async def delete_project(db: aiosqlite.Connection, project_id: str) -> None:
    await db.execute("DELETE FROM projects WHERE project_id=?", (project_id,))
    await db.commit()


async def create_job(db: aiosqlite.Connection, job_id: str, project_id: str) -> None:
    now = _now()
    await db.execute(
        """
        INSERT INTO jobs (job_id, project_id, stage, status, progress, created_at, updated_at)
        VALUES (?, ?, 'queued', 'queued', 0, ?, ?)
        """,
        (job_id, project_id, now, now),
    )
    await db.commit()


async def get_job(
    db: aiosqlite.Connection, job_id: str
) -> Optional[dict[str, Any]]:
    cursor = await db.execute("SELECT * FROM jobs WHERE job_id=?", (job_id,))
    row = await cursor.fetchone()
    return dict(row) if row else None


async def update_job(
    db: aiosqlite.Connection, job_id: str, fields: dict[str, Any]
) -> None:
    fields["updated_at"] = _now()
    set_clause = ", ".join(f"{k}=?" for k in fields)
    values = list(fields.values()) + [job_id]
    await db.execute(f"UPDATE jobs SET {set_clause} WHERE job_id=?", values)
    await db.commit()


def encode_json(obj: Any) -> str:
    return json.dumps(obj)


def decode_json(raw: Optional[str]) -> Any:
    if raw is None:
        return None
    return json.loads(raw)
