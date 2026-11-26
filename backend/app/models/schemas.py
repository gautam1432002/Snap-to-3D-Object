"""
app/models/schemas.py
─────────────────────
Pydantic v2 request/response schemas for all API endpoints.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


# ── Quality Metrics ───────────────────────────────────────────────────────────

class QualityMetrics(BaseModel):
    solidity: float = Field(..., ge=0.0, le=1.0, description="Convex-hull solidity")
    sharpness: float = Field(..., ge=0.0, description="Laplacian variance (focus measure)")
    crop_edge_quality: float = Field(..., ge=0.0, le=1.0, description="Fraction of edge pixels that are fully transparent")
    pixel_coverage: float = Field(..., ge=0.0, le=1.0, description="Fraction of bounding-box pixels that are opaque")


# ── Contour ───────────────────────────────────────────────────────────────────

class ContourPoint(BaseModel):
    x: float = Field(..., ge=0.0, le=1.0)
    y: float = Field(..., ge=0.0, le=1.0)


class ContourResult(BaseModel):
    points: list[ContourPoint]
    perimeter_mm: float
    edge_color_hex: str = Field(..., pattern=r"^#[0-9A-Fa-f]{6}$")
    smoothness: str


# ── Gemini metadata ───────────────────────────────────────────────────────────

class GeminiMetaResponse(BaseModel):
    object_name: str = ""
    category: str = ""
    suggested_name: str = ""
    complexity: str = "Medium"      # Easy | Medium | Hard
    dominant_colors: list[str] = []
    paper_size: str = "A4"
    estimated_height_cm: float = 18.0
    is_safe: bool = True


# ── Scan / Upload ─────────────────────────────────────────────────────────────

class ScanResponse(BaseModel):
    project_id: str
    job_id: str
    status: str = "queued"


# ── Job status ────────────────────────────────────────────────────────────────

class JobStatusResponse(BaseModel):
    job_id: str
    project_id: str
    stage: str
    status: str         # queued | running | done | failed
    progress: int = Field(..., ge=0, le=100)
    error: Optional[str] = None
    created_at: datetime
    updated_at: datetime


# ── Project ───────────────────────────────────────────────────────────────────

class ProjectResponse(BaseModel):
    project_id: str
    device_id: str
    original_filename: str
    status: str
    stage: str
    object_name: str
    category: str
    suggested_name: str
    complexity: str
    paper_size: str
    estimated_height_cm: float
    dominant_colors: list[str]
    quality_metrics: Optional[QualityMetrics] = None
    contour: Optional[ContourResult] = None
    preview_url: Optional[str] = None
    trimmed_url: Optional[str] = None
    polished_url: Optional[str] = None
    sheet_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class ProjectListResponse(BaseModel):
    items: list[ProjectResponse]
    total: int
    limit: int
    offset: int


# ── Mask update ───────────────────────────────────────────────────────────────

class MaskUpdateResponse(BaseModel):
    project_id: str
    status: str = "reprocessed"
    contour: Optional[ContourResult] = None


# ── Error ─────────────────────────────────────────────────────────────────────

class ErrorResponse(BaseModel):
    detail: str
    code: Optional[str] = None
    extra: Optional[Any] = None
