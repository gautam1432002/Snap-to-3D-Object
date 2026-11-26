"""
app/services/segmentation.py
─────────────────────────────
Server-side background removal + post-processing.

Fixes prototype flaw #1: rembg (ONNX) replaces browser-side TensorFlow.js,
so Android never crashes from RAM exhaustion.

Pipeline
────────
1. rembg.remove() → RGBA PNG with alpha mask
2. Connected-component denoising (drop CC < 0.5% of total pixels)
3. Sigmoid contrast boost on alpha channel → sharper silhouette edges
4. Halo decontamination: suppress semi-transparent fringe pixels
5. Tight alpha crop → save trimmed.png (full-res) + preview.png (512px)
6. Compute QualityMetrics via convex hull, Laplacian sharpness
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

try:
    from rembg import remove as rembg_remove, new_session
    _REMBG_AVAILABLE = True
except Exception:  # noqa: BLE001
    _REMBG_AVAILABLE = False
    rembg_remove = None
    new_session = None

_REMBG_SESSION = None


def _get_rembg_session():
    global _REMBG_SESSION
    if _REMBG_SESSION is None and _REMBG_AVAILABLE and new_session is not None:
        try:
            _REMBG_SESSION = new_session("u2net")
        except Exception as exc:
            logger.warning("Could not initialize rembg session: %s", exc)
    return _REMBG_SESSION


logger = logging.getLogger(__name__)

PREVIEW_MAX = 512


@dataclass
class SegResult:
    trimmed_path: Path
    preview_path: Path
    solidity: float
    sharpness: float
    crop_edge_quality: float
    pixel_coverage: float


def _rembg_remove(image_bytes: bytes) -> Image.Image:
    """Remove background; fallback to zeroed alpha if rembg unavailable."""
    session = _get_rembg_session()
    if _REMBG_AVAILABLE and session is not None and rembg_remove is not None:
        try:
            out = rembg_remove(image_bytes, session=session)
            return Image.open(__import__("io").BytesIO(out)).convert("RGBA")
        except Exception as exc:
            logger.warning("rembg execution failed (%s) — falling back to raw RGBA", exc)
    # Fallback for environments without ONNX (e.g. CI without model weights)
    img = Image.open(__import__("io").BytesIO(image_bytes)).convert("RGBA")
    logger.warning("rembg not available — using raw image with full alpha")
    return img


def _denoise_alpha(alpha: np.ndarray) -> np.ndarray:
    """Drop connected components smaller than 0.5% of total pixel area."""
    binary = (alpha > 127).astype(np.uint8)
    n_labels, labels, stats, _ = cv2.connectedComponentsWithStats(binary, connectivity=8)
    total = alpha.size
    threshold = int(total * 0.005)
    clean = np.zeros_like(alpha)
    for lbl in range(1, n_labels):
        if stats[lbl, cv2.CC_STAT_AREA] >= threshold:
            clean[labels == lbl] = alpha[labels == lbl]
    return clean


def _sigmoid_alpha(alpha: np.ndarray, k: float = 8.0, mid: float = 0.45) -> np.ndarray:
    """Sigmoid contrast boost to sharpen soft alpha edges."""
    a = alpha.astype(np.float32) / 255.0
    boosted = 1.0 / (1.0 + np.exp(-k * (a - mid)))
    # Preserve fully transparent regions
    boosted[alpha < 5] = 0.0
    # Preserve fully opaque regions
    boosted[alpha > 250] = 1.0
    return np.clip(boosted * 255, 0, 255).astype(np.uint8)


def _decontaminate_halo(rgba: np.ndarray) -> np.ndarray:
    """Suppress semi-transparent fringe pixels (halo decontamination)."""
    alpha = rgba[:, :, 3].copy()
    halo_mask = (alpha > 10) & (alpha < 180)
    # Erode the halo region slightly
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    strong_alpha = (alpha > 180).astype(np.uint8)
    eroded = cv2.erode(strong_alpha, kernel, iterations=1)
    # Suppress halo pixels not supported by strong neighbours
    fringe = halo_mask & (eroded == 0)
    rgba[fringe, 3] = 0
    return rgba


def _tight_crop(rgba: np.ndarray) -> np.ndarray:
    """Crop to bounding box of non-transparent pixels (1px margin)."""
    alpha = rgba[:, :, 3]
    rows = np.any(alpha > 0, axis=1)
    cols = np.any(alpha > 0, axis=0)
    if not rows.any():
        return rgba
    r0, r1 = np.where(rows)[0][[0, -1]]
    c0, c1 = np.where(cols)[0][[0, -1]]
    # Add 1-px safety margin
    h, w = rgba.shape[:2]
    r0 = max(0, r0 - 1)
    r1 = min(h - 1, r1 + 1)
    c0 = max(0, c0 - 1)
    c1 = min(w - 1, c1 + 1)
    return rgba[r0 : r1 + 1, c0 : c1 + 1]


def _quality_metrics(rgba: np.ndarray) -> tuple[float, float, float, float]:
    """
    Returns (solidity, sharpness, crop_edge_quality, pixel_coverage).
    """
    alpha = rgba[:, :, 3]
    gray = cv2.cvtColor(rgba[:, :, :3], cv2.COLOR_RGB2GRAY)

    # Solidity = area / convex hull area
    binary = (alpha > 127).astype(np.uint8) * 255
    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    solidity = 0.0
    if contours:
        cnt = max(contours, key=cv2.contourArea)
        area = cv2.contourArea(cnt)
        hull = cv2.convexHull(cnt)
        hull_area = cv2.contourArea(hull)
        solidity = float(area / hull_area) if hull_area > 0 else 0.0

    # Sharpness: Laplacian variance on the RGB region (non-transparent only)
    mask = (alpha > 127).astype(np.uint8)
    laplacian = cv2.Laplacian(gray, cv2.CV_64F)
    if mask.any():
        sharpness = float(laplacian[mask == 1].var())
    else:
        sharpness = 0.0

    # Crop-edge quality: fraction of 1-px border pixels that are fully transparent
    h, w = alpha.shape
    border = np.concatenate([alpha[0, :], alpha[-1, :], alpha[:, 0], alpha[:, -1]])
    crop_edge_quality = float(np.mean(border < 5))

    # Pixel coverage inside bounding box
    pixel_coverage = float(np.mean(alpha > 127))

    return solidity, sharpness, crop_edge_quality, pixel_coverage


async def run_segmentation(image_path: Path, output_dir: Path) -> SegResult:
    """
    Full segmentation pipeline. Writes trimmed.png and preview.png to output_dir.
    Returns a SegResult with paths and quality metrics.
    """
    output_dir.mkdir(parents=True, exist_ok=True)

    image_bytes = image_path.read_bytes()

    # 1. Background removal
    logger.info("Running rembg on %s", image_path.name)
    pil_rgba = _rembg_remove(image_bytes)
    rgba = np.array(pil_rgba)

    # 2. Connected-component denoising
    rgba[:, :, 3] = _denoise_alpha(rgba[:, :, 3])

    # 3. Sigmoid alpha sharpening
    rgba[:, :, 3] = _sigmoid_alpha(rgba[:, :, 3])

    # 4. Halo decontamination
    rgba = _decontaminate_halo(rgba)

    # 5. Tight crop
    rgba = _tight_crop(rgba)

    # 6. Quality metrics
    solidity, sharpness, crop_edge_quality, pixel_coverage = _quality_metrics(rgba)

    # 7. Save full-res trimmed PNG
    trimmed_path = output_dir / "trimmed.png"
    Image.fromarray(rgba, "RGBA").save(trimmed_path, "PNG", optimize=False)

    # 8. Save 512px preview PNG (LANCZOS)
    preview_path = output_dir / "preview.png"
    thumb = Image.fromarray(rgba, "RGBA")
    thumb.thumbnail((PREVIEW_MAX, PREVIEW_MAX), Image.LANCZOS)
    thumb.save(preview_path, "PNG", optimize=True)

    logger.info(
        "Segmentation done — solidity=%.3f sharpness=%.1f crop_edge=%.3f coverage=%.3f",
        solidity, sharpness, crop_edge_quality, pixel_coverage,
    )

    return SegResult(
        trimmed_path=trimmed_path,
        preview_path=preview_path,
        solidity=solidity,
        sharpness=sharpness,
        crop_edge_quality=crop_edge_quality,
        pixel_coverage=pixel_coverage,
    )
