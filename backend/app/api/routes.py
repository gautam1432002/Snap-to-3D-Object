"""
app/api/routes.py
─────────────────
Core API routes for scanning, background job tracking, project CRUD,
inline base64 assets delivery, touch-up mask updates, Gemini polish/sheet
generation, and file serving.
"""
from __future__ import annotations

import base64
import io
import logging
import shutil
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import aiosqlite
from fastapi import APIRouter, BackgroundTasks, Depends, File, Header, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from PIL import Image

from app.core.config import get_settings
from app.db.database import (
    create_job,
    create_project,
    decode_json,
    delete_project,
    encode_json,
    get_db,
    get_job,
    get_project,
    list_projects,
    update_job,
    update_project,
)
from app.models.schemas import (
    ContourResult,
    JobStatusResponse,
    MaskUpdateResponse,
    ProjectAssetsResponse,
    ProjectListResponse,
    ProjectResponse,
    QualityMetrics,
    ScanResponse,
)
from app.services.contour import extract_contour
from app.services.gemini_service import (
    generate_cutout_sheet_with_status,
    get_object_metadata,
    polish_cutout_with_status,
)
from app.services.segmentation import ensure_transparent_cutout, run_segmentation

logger = logging.getLogger(__name__)
router = APIRouter()

ALLOWED_MIMES = {"image/jpeg", "image/png", "image/webp"}


def _file_to_data_uri(path_str: Optional[str]) -> Optional[str]:
    if not path_str:
        return None
    p = Path(path_str)
    if not p.exists():
        return None
    raw = p.read_bytes()
    b64 = base64.b64encode(raw).decode("ascii")
    return f"data:image/png;base64,{b64}"


# ── Pipeline Runner ───────────────────────────────────────────────────────────

async def _run_scan_pipeline(project_id: str, job_id: str, original_path: Path):
    settings = get_settings()
    db_path = str(settings.DATABASE_URL).replace("sqlite+aiosqlite:///", "")
    project_dir = settings.STORAGE_PATH / project_id

    async with aiosqlite.connect(db_path) as db:
        try:
            await update_job(db, job_id, {"stage": "segmentation", "status": "running", "progress": 20})
            await update_project(db, project_id, {"status": "processing", "stage": "segmentation"})

            seg_result = await run_segmentation(original_path, project_dir)

            await update_job(db, job_id, {"stage": "contour", "progress": 50})
            await update_project(db, project_id, {"stage": "contour"})

            contour_result = extract_contour(seg_result.trimmed_path, smoothness="Medium")

            await update_job(db, job_id, {"stage": "metadata", "progress": 75})
            await update_project(db, project_id, {"stage": "metadata"})

            trimmed_bytes = seg_result.trimmed_path.read_bytes()
            meta = await get_object_metadata(trimmed_bytes, mime="image/png")

            quality_dict = {
                "solidity": seg_result.solidity,
                "sharpness": seg_result.sharpness,
                "crop_edge_quality": seg_result.crop_edge_quality,
                "pixel_coverage": seg_result.pixel_coverage,
            }
            contour_dict = {
                "points": contour_result.points if contour_result else [],
                "perimeter_mm": contour_result.perimeter_mm if contour_result else 0.0,
                "edge_color_hex": contour_result.edge_color_hex if contour_result else "#2EC4B6",
                "smoothness": contour_result.smoothness if contour_result else "Medium",
            }

            await update_project(
                db,
                project_id,
                {
                    "trimmed_path": str(seg_result.trimmed_path),
                    "preview_path": str(seg_result.preview_path),
                    "status": "ready",
                    "stage": "done",
                    "object_name": meta.object_name,
                    "category": meta.category,
                    "suggested_name": meta.suggested_name,
                    "complexity": meta.complexity,
                    "paper_size": meta.paper_size,
                    "estimated_height_cm": meta.estimated_height_cm,
                    "dominant_colors": encode_json(meta.dominant_colors),
                    "quality_metrics": encode_json(quality_dict),
                    "contour": encode_json(contour_dict),
                    "engine_used": seg_result.engine_used,
                    "ai_source": meta.ai_source,
                    "ai_warning": meta.ai_warning,
                },
            )

            await update_job(db, job_id, {"stage": "done", "status": "done", "progress": 100})
            logger.info("Scan pipeline complete for project %s (%s)", project_id, seg_result.engine_used)

        except Exception as exc:
            logger.exception("Pipeline failed for project %s: %s", project_id, exc)
            await update_job(db, job_id, {"status": "failed", "error_msg": str(exc)})
            await update_project(db, project_id, {"status": "failed"})


# ── Project Entity Mapper ─────────────────────────────────────────────────────

def _map_project_response(p: dict) -> ProjectResponse:
    project_id = p["project_id"]
    qm_raw = decode_json(p.get("quality_metrics"))
    contour_raw = decode_json(p.get("contour"))
    dominant_colors = decode_json(p.get("dominant_colors")) or []

    preview_url = f"/api/v1/projects/{project_id}/preview" if p.get("preview_path") else None
    trimmed_url = f"/api/v1/projects/{project_id}/trimmed" if p.get("trimmed_path") else None
    polished_url = f"/api/v1/projects/{project_id}/polished" if p.get("polished_path") else None
    sheet_url = f"/api/v1/projects/{project_id}/sheet" if p.get("sheet_path") else None

    return ProjectResponse(
        project_id=project_id,
        device_id=p["device_id"],
        original_filename=p["original_filename"],
        status=p["status"],
        stage=p["stage"],
        object_name=p["object_name"],
        category=p["category"],
        suggested_name=p["suggested_name"],
        complexity=p["complexity"],
        paper_size=p["paper_size"],
        estimated_height_cm=p["estimated_height_cm"],
        dominant_colors=dominant_colors,
        quality_metrics=QualityMetrics(**qm_raw) if qm_raw else None,
        contour=ContourResult(**contour_raw) if contour_raw else None,
        engine_used=p.get("engine_used") or None,
        ai_source=p.get("ai_source") or None,
        ai_warning=p.get("ai_warning"),
        preview_url=preview_url,
        trimmed_url=trimmed_url,
        polished_url=polished_url,
        sheet_url=sheet_url,
        created_at=datetime.fromisoformat(p["created_at"]),
        updated_at=datetime.fromisoformat(p["updated_at"]),
    )


# ── Health ────────────────────────────────────────────────────────────────────

@router.get("/health", tags=["system"])
async def health_check():
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


# ── Scanning & Jobs ───────────────────────────────────────────────────────────

@router.post(
    "/api/v1/projects/scan",
    response_model=ScanResponse,
    status_code=status.HTTP_202_ACCEPTED,
    tags=["scan"],
)
async def scan_upload(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    x_device_id: str = Header(..., alias="X-Device-ID"),
    db: aiosqlite.Connection = Depends(get_db),
):
    settings = get_settings()

    if file.content_type not in ALLOWED_MIMES:
        raise HTTPException(
            status_code=getattr(status, "HTTP_422_UNPROCESSABLE_CONTENT", 422),
            detail=f"Unsupported format '{file.content_type}'. Must be JPEG, PNG, or WebP.",
        )

    contents = await file.read()
    if len(contents) > settings.MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=getattr(status, "HTTP_413_CONTENT_TOO_LARGE", 413),
            detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_BYTES // (1024 * 1024)} MB.",
        )

    project_id = str(uuid.uuid4())
    job_id = str(uuid.uuid4())
    project_dir = settings.STORAGE_PATH / project_id
    project_dir.mkdir(parents=True, exist_ok=True)

    ext = Path(file.filename or "image.jpg").suffix or ".jpg"
    original_path = project_dir / f"original{ext}"
    original_path.write_bytes(contents)

    await create_project(
        db,
        {
            "project_id": project_id,
            "device_id": x_device_id,
            "original_filename": file.filename or "upload.jpg",
            "original_path": str(original_path),
            "status": "queued",
            "stage": "uploaded",
        },
    )
    await create_job(db, job_id, project_id)
    background_tasks.add_task(_run_scan_pipeline, project_id, job_id, original_path)

    return ScanResponse(project_id=project_id, job_id=job_id, status="queued")


@router.get(
    "/api/v1/jobs/{job_id}",
    response_model=JobStatusResponse,
    tags=["jobs"],
)
async def get_job_status(
    job_id: str,
    db: aiosqlite.Connection = Depends(get_db),
):
    job = await get_job(db, job_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    return JobStatusResponse(
        job_id=job["job_id"],
        project_id=job["project_id"],
        stage=job["stage"],
        status=job["status"],
        progress=job["progress"],
        error=job["error_msg"],
        created_at=datetime.fromisoformat(job["created_at"]),
        updated_at=datetime.fromisoformat(job["updated_at"]),
    )


# ── Projects CRUD & Inline Base64 Assets ──────────────────────────────────────

@router.get(
    "/api/v1/projects",
    response_model=ProjectListResponse,
    tags=["projects"],
)
async def list_user_projects(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    x_device_id: str = Header(..., alias="X-Device-ID"),
    db: aiosqlite.Connection = Depends(get_db),
):
    rows, total = await list_projects(db, device_id=x_device_id, limit=limit, offset=offset)
    items = [_map_project_response(r) for r in rows]
    return ProjectListResponse(items=items, total=total, limit=limit, offset=offset)


@router.get(
    "/api/v1/projects/{project_id}",
    response_model=ProjectResponse,
    tags=["projects"],
)
async def get_project_details(
    project_id: str,
    x_device_id: Optional[str] = Header(None, alias="X-Device-ID"),
    db: aiosqlite.Connection = Depends(get_db),
):
    proj = await get_project(db, project_id, device_id=x_device_id)
    if not proj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return _map_project_response(proj)


@router.get(
    "/api/v1/projects/{project_id}/assets",
    response_model=ProjectAssetsResponse,
    tags=["projects"],
)
async def get_project_assets(
    project_id: str,
    smoothness: Optional[str] = Query(None),
    height_cm: Optional[float] = Query(None, ge=5.0, le=60.0),
    x_device_id: Optional[str] = Header(None, alias="X-Device-ID"),
    db: aiosqlite.Connection = Depends(get_db),
):
    """
    Returns inline base64 data URIs alongside contour_json, perimeter_mm,
    edge_color, quality metrics, and AI status so React Native, Three.js
    WebViews, and expo-print PDFs never fail on CORS or header issues.
    """
    proj = await get_project(db, project_id, device_id=x_device_id)
    if not proj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    qm_raw = decode_json(proj.get("quality_metrics"))
    contour_raw = decode_json(proj.get("contour"))
    dominant_colors = decode_json(proj.get("dominant_colors")) or []

    # Recompute contour on demand if caller requests a different smoothness/height
    active_img_path = proj.get("polished_path") or proj.get("trimmed_path")
    if active_img_path and Path(active_img_path).exists() and (smoothness or height_cm):
        target_smooth = smoothness if smoothness in {"Easy", "Medium", "Hard"} else (
            contour_raw.get("smoothness", "Medium") if contour_raw else "Medium"
        )
        target_height = height_cm or proj.get("estimated_height_cm") or 18.0
        recomputed = extract_contour(Path(active_img_path), smoothness=target_smooth, height_cm=target_height)
        if recomputed:
            contour_raw = {
                "points": recomputed.points,
                "perimeter_mm": recomputed.perimeter_mm,
                "edge_color_hex": recomputed.edge_color_hex,
                "smoothness": recomputed.smoothness,
            }

    contour_model = ContourResult(**contour_raw) if contour_raw else None
    edge_color = (
        contour_model.edge_color_hex
        if contour_model
        else (dominant_colors[0] if dominant_colors else "#2EC4B6")
    )

    return ProjectAssetsResponse(
        project_id=project_id,
        status=proj["status"],
        object_name=proj["object_name"],
        suggested_name=proj["suggested_name"],
        category=proj["category"],
        complexity=proj["complexity"],
        paper_size=proj["paper_size"],
        estimated_height_cm=proj["estimated_height_cm"],
        dominant_colors=dominant_colors,
        quality_metrics=QualityMetrics(**qm_raw) if qm_raw else None,
        contour=contour_model,
        perimeter_mm=contour_model.perimeter_mm if contour_model else 0.0,
        edge_color=edge_color,
        engine_used=proj.get("engine_used") or None,
        ai_source=proj.get("ai_source") or None,
        ai_warning=proj.get("ai_warning"),
        preview_base64=_file_to_data_uri(proj.get("preview_path")),
        trimmed_base64=_file_to_data_uri(proj.get("trimmed_path")),
        polished_base64=_file_to_data_uri(proj.get("polished_path")),
        sheet_base64=_file_to_data_uri(proj.get("sheet_path")),
    )


@router.delete(
    "/api/v1/projects/{project_id}",
    tags=["projects"],
)
async def delete_project_endpoint(
    project_id: str,
    x_device_id: Optional[str] = Header(None, alias="X-Device-ID"),
    db: aiosqlite.Connection = Depends(get_db),
):
    settings = get_settings()
    proj = await get_project(db, project_id, device_id=x_device_id)
    if not proj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    await delete_project(db, project_id)
    project_dir = settings.STORAGE_PATH / project_id
    if project_dir.exists():
        shutil.rmtree(project_dir, ignore_errors=True)

    return {"deleted": True, "project_id": project_id}


# ── Touch-Up Mask & Edits ─────────────────────────────────────────────────────

@router.post(
    "/api/v1/projects/{project_id}/mask",
    response_model=MaskUpdateResponse,
    tags=["projects"],
)
async def update_mask(
    project_id: str,
    mask: UploadFile = File(...),
    x_device_id: Optional[str] = Header(None, alias="X-Device-ID"),
    db: aiosqlite.Connection = Depends(get_db),
):
    proj = await get_project(db, project_id, device_id=x_device_id)
    if not proj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    trimmed_path = Path(proj["trimmed_path"]) if proj.get("trimmed_path") else None
    if not trimmed_path or not trimmed_path.exists():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Trimmed image not ready")

    mask_bytes = await mask.read()
    mask_img = Image.open(io.BytesIO(mask_bytes)).convert("L")
    trimmed_img = Image.open(trimmed_path).convert("RGBA")

    if mask_img.size != trimmed_img.size:
        mask_img = mask_img.resize(trimmed_img.size, Image.LANCZOS)

    trimmed_img.putalpha(mask_img)
    trimmed_img.save(trimmed_path, "PNG")

    contour_result = extract_contour(trimmed_path, smoothness=proj.get("complexity", "Medium"))
    contour_dict = {
        "points": contour_result.points if contour_result else [],
        "perimeter_mm": contour_result.perimeter_mm if contour_result else 0.0,
        "edge_color_hex": contour_result.edge_color_hex if contour_result else "#2EC4B6",
        "smoothness": contour_result.smoothness if contour_result else "Medium",
    }
    await update_project(db, project_id, {"contour": encode_json(contour_dict)})

    return MaskUpdateResponse(
        project_id=project_id,
        status="reprocessed",
        contour=ContourResult(**contour_dict) if contour_result else None,
    )


# ── Gemini Polish & Cutout Sheet ──────────────────────────────────────────────

@router.post(
    "/api/v1/projects/{project_id}/polish",
    tags=["gemini"],
)
async def polish_project_image(
    project_id: str,
    cropped_sides: list[str] = Query(default=[]),
    x_device_id: Optional[str] = Header(None, alias="X-Device-ID"),
    db: aiosqlite.Connection = Depends(get_db),
):
    proj = await get_project(db, project_id, device_id=x_device_id)
    if not proj or not proj.get("trimmed_path"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project trimmed image not found")

    trimmed_path = Path(proj["trimmed_path"])
    if not trimmed_path.exists():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Trimmed image missing on disk")

    polished_bytes, ai_source, ai_warning = await polish_cutout_with_status(
        trimmed_path.read_bytes(), cropped_sides=cropped_sides
    )
    polished_bytes = ensure_transparent_cutout(polished_bytes)

    polished_path = trimmed_path.parent / "polished.png"
    polished_path.write_bytes(polished_bytes)

    contour_result = extract_contour(polished_path, smoothness=proj.get("complexity", "Medium"))
    contour_dict = (
        {
            "points": contour_result.points,
            "perimeter_mm": contour_result.perimeter_mm,
            "edge_color_hex": contour_result.edge_color_hex,
            "smoothness": contour_result.smoothness,
        }
        if contour_result
        else decode_json(proj.get("contour"))
    )

    update_fields = {
        "polished_path": str(polished_path),
        "ai_source": ai_source,
        "ai_warning": ai_warning,
    }
    if contour_dict:
        update_fields["contour"] = encode_json(contour_dict)

    await update_project(db, project_id, update_fields)
    b64 = base64.b64encode(polished_bytes).decode("ascii")
    return {
        "status": "polished",
        "project_id": project_id,
        "polished_url": f"/api/v1/projects/{project_id}/polished",
        "polished_base64": f"data:image/png;base64,{b64}",
        "contour": contour_dict,
        "ai_source": ai_source,
        "ai_warning": ai_warning,
    }


@router.post(
    "/api/v1/projects/{project_id}/cutout-sheet",
    tags=["gemini"],
)
async def generate_sheet_for_project(
    project_id: str,
    x_device_id: Optional[str] = Header(None, alias="X-Device-ID"),
    db: aiosqlite.Connection = Depends(get_db),
):
    proj = await get_project(db, project_id, device_id=x_device_id)
    if not proj or not proj.get("trimmed_path"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project trimmed image not found")

    trimmed_path = Path(proj["trimmed_path"])
    sheet_bytes, ai_source, ai_warning = await generate_cutout_sheet_with_status(
        trimmed_path.read_bytes(),
        name=proj.get("suggested_name") or proj.get("object_name") or "Model",
        paper_size=proj.get("paper_size", "A4"),
    )

    sheet_path = trimmed_path.parent / "sheet.png"
    sheet_path.write_bytes(sheet_bytes)

    await update_project(db, project_id, {"sheet_path": str(sheet_path)})
    b64 = base64.b64encode(sheet_bytes).decode("ascii")
    return {
        "status": "generated",
        "project_id": project_id,
        "sheet_url": f"/api/v1/projects/{project_id}/sheet",
        "sheet_base64": f"data:image/png;base64,{b64}",
        "ai_source": ai_source,
        "ai_warning": ai_warning,
    }


# ── File Serving (Preview, Trimmed, Polished, Sheet) ───────────────────────────

@router.get("/api/v1/projects/{project_id}/preview", tags=["files"])
async def get_preview_image(
    project_id: str,
    x_device_id: Optional[str] = Header(None, alias="X-Device-ID"),
    db: aiosqlite.Connection = Depends(get_db),
):
    proj = await get_project(db, project_id)
    if not proj or not proj.get("preview_path"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Preview not found")
    p = Path(proj["preview_path"])
    if not p.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File missing on disk")
    return FileResponse(p, media_type="image/png")


@router.get("/api/v1/projects/{project_id}/trimmed", tags=["files"])
async def get_trimmed_image(
    project_id: str,
    x_device_id: Optional[str] = Header(None, alias="X-Device-ID"),
    db: aiosqlite.Connection = Depends(get_db),
):
    proj = await get_project(db, project_id)
    if not proj or not proj.get("trimmed_path"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trimmed image not found")
    p = Path(proj["trimmed_path"])
    if not p.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File missing on disk")
    return FileResponse(p, media_type="image/png")


@router.get("/api/v1/projects/{project_id}/polished", tags=["files"])
async def get_polished_image(
    project_id: str,
    x_device_id: Optional[str] = Header(None, alias="X-Device-ID"),
    db: aiosqlite.Connection = Depends(get_db),
):
    proj = await get_project(db, project_id)
    if not proj or not proj.get("polished_path"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Polished image not found")
    p = Path(proj["polished_path"])
    if not p.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File missing on disk")
    return FileResponse(p, media_type="image/png")


@router.get("/api/v1/projects/{project_id}/sheet", tags=["files"])
async def get_sheet_image(
    project_id: str,
    x_device_id: Optional[str] = Header(None, alias="X-Device-ID"),
    db: aiosqlite.Connection = Depends(get_db),
):
    proj = await get_project(db, project_id)
    if not proj or not proj.get("sheet_path"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sheet image not found")
    p = Path(proj["sheet_path"])
    if not p.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File missing on disk")
    return FileResponse(p, media_type="image/png")
