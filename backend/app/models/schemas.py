"""
app/models/schemas.py
─────────────────────
Pydantic v2 request/response schemas for all API endpoints.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


class QualityMetrics(BaseModel):
    solidity: float = Field(..., ge=0.0, le=1.0, description="Convex-hull solidity")
    sharpness: float = Field(..., ge=0.0, description="Laplacian variance (focus measure)")
    crop_edge_quality: float = Field(..., ge=0.0, le=1.0, description="Fraction of edge pixels that are fully transparent")
    pixel_coverage: float = Field(..., ge=0.0, le=1.0, description="Fraction of bounding-box pixels that are opaque")


class ContourPoint(BaseModel):
    x: float = Field(..., ge=0.0, le=1.0)
    y: float = Field(..., ge=0.0, le=1.0)


class ContourResult(BaseModel):
    points: list[ContourPoint]
    perimeter_mm: float
    edge_color_hex: str = Field(..., pattern=r"^#[0-9A-Fa-f]{6}$")
    smoothness: str


class GeminiMetaResponse(BaseModel):
    object_name: str = ""
    category: str = ""
    suggested_name: str = ""
    complexity: str = "Medium"
    dominant_colors: list[str] = []
    paper_size: str = "A4"
    estimated_height_cm: float = 18.0
    is_safe: bool = True
    ai_source: str = "fallback"
    ai_warning: Optional[str] = None


class ScanResponse(BaseModel):
    project_id: str
    job_id: str
    status: str = "queued"


class Base64ScanRequest(BaseModel):
    image_base64: str = Field(..., min_length=16)
    filename: str = "scan.jpg"
    mime_type: str = "image/jpeg"


class JobStatusResponse(BaseModel):
    job_id: str
    project_id: str
    stage: str
    status: str
    progress: int = Field(..., ge=0, le=100)
    error: Optional[str] = None
    created_at: datetime
    updated_at: datetime


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
    engine_used: Optional[str] = None
    ai_source: Optional[str] = None
    ai_warning: Optional[str] = None
    preview_url: Optional[str] = None
    trimmed_url: Optional[str] = None
    polished_url: Optional[str] = None
    sheet_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class ProjectAssetsResponse(BaseModel):
    project_id: str
    status: str
    object_name: str
    suggested_name: str
    category: str
    complexity: str
    paper_size: str
    estimated_height_cm: float
    dominant_colors: list[str]
    quality_metrics: Optional[QualityMetrics] = None
    contour: Optional[ContourResult] = None
    perimeter_mm: float = 0.0
    edge_color: str = "#2EC4B6"
    engine_used: Optional[str] = None
    ai_source: Optional[str] = None
    ai_warning: Optional[str] = None
    preview_base64: Optional[str] = None
    trimmed_base64: Optional[str] = None
    polished_base64: Optional[str] = None
    sheet_base64: Optional[str] = None


class ProjectListResponse(BaseModel):
    items: list[ProjectResponse]
    total: int
    limit: int
    offset: int


class MaskUpdateResponse(BaseModel):
    project_id: str
    status: str = "reprocessed"
    contour: Optional[ContourResult] = None


class ErrorResponse(BaseModel):
    detail: str
    code: Optional[str] = None
    extra: Optional[Any] = None
