"""
app/services/contour.py
────────────────────────
Silhouette contour extraction — fixes prototype flaw #10.

Changes vs prototype
────────────────────
• Extract at 256×256 (not 128×128) for higher fidelity
• OpenCV findContours → approxPolyDP with complexity-tuned epsilon
• Chaikin corner-cutting for smooth curves, then re-simplify
• Dominant edge colour via k-means (k=3) on non-transparent edge pixels
• Output: normalised [{x,y}] ∈ [0,1], perimeter_mm, edge_color_hex
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import cv2
import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)

CONTOUR_SIZE = 256

# Complexity → approxPolyDP epsilon (fraction of arc length)
_EPSILON_MAP = {
    "Easy":   0.032,   # ~12-16 points
    "Medium": 0.020,   # ~18-24 points
    "Hard":   0.011,   # ~26-34 points
}

# Physical scale: default object height in mm
_DEFAULT_HEIGHT_MM = 180.0


@dataclass
class ContourResult:
    points: list[dict[str, float]]
    perimeter_mm: float
    edge_color_hex: str
    smoothness: str


# ── Chaikin corner-cutting ────────────────────────────────────────────────────

def _chaikin(pts: np.ndarray, iterations: int = 2) -> np.ndarray:
    """Apply Chaikin's corner-cutting algorithm for `iterations` rounds."""
    for _ in range(iterations):
        new_pts = []
        n = len(pts)
        for i in range(n):
            p0 = pts[i]
            p1 = pts[(i + 1) % n]
            new_pts.append(0.75 * p0 + 0.25 * p1)
            new_pts.append(0.25 * p0 + 0.75 * p1)
        pts = np.array(new_pts)
    return pts


# ── Dominant edge colour ──────────────────────────────────────────────────────

def _dominant_edge_color(rgba: np.ndarray, contour: np.ndarray, k: int = 3) -> str:
    """
    Sample RGB pixels along the contour edge that are ≥ 50% opaque,
    run k-means (k=3), and return the dominant cluster colour as #RRGGBB.
    """
    h, w = rgba.shape[:2]
    # Dilate contour region for sampling
    mask = np.zeros((h, w), dtype=np.uint8)
    cv2.drawContours(mask, [contour], -1, 255, thickness=4)

    alpha = rgba[:, :, 3]
    sample_mask = (mask == 255) & (alpha >= 127)
    rgb_pixels = rgba[:, :, :3][sample_mask].astype(np.float32)

    if len(rgb_pixels) < k:
        return "#888888"

    max_samples = 2000
    if len(rgb_pixels) > max_samples:
        idx = np.random.choice(len(rgb_pixels), max_samples, replace=False)
        rgb_pixels = rgb_pixels[idx]

    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 20, 1.0)
    _, labels, centers = cv2.kmeans(
        rgb_pixels, k, None, criteria, 5, cv2.KMEANS_RANDOM_CENTERS
    )
    counts = np.bincount(labels.flatten(), minlength=k)
    dominant = centers[np.argmax(counts)].astype(int)
    return "#{:02X}{:02X}{:02X}".format(dominant[0], dominant[1], dominant[2])


# ── Main extraction ───────────────────────────────────────────────────────────

def extract_contour(
    trimmed_png_path: Path,
    smoothness: str = "Medium",
    height_cm: float = 18.0,
) -> Optional[ContourResult]:
    """
    Extract silhouette contour from a trimmed RGBA PNG.

    Parameters
    ----------
    trimmed_png_path : Path to full-res trimmed.png (RGBA)
    smoothness       : 'Easy' | 'Medium' | 'Hard'
    height_cm        : Estimated real-world height for perimeter scaling

    Returns
    -------
    ContourResult or None if no contour found
    """
    epsilon_ratio = _EPSILON_MAP.get(smoothness, _EPSILON_MAP["Medium"])

    # Load + resize to 256×256 for processing
    pil = Image.open(trimmed_png_path).convert("RGBA")
    orig_w, orig_h = pil.size
    pil_small = pil.resize((CONTOUR_SIZE, CONTOUR_SIZE), Image.LANCZOS)
    rgba = np.array(pil_small)

    # Binary alpha mask
    alpha = rgba[:, :, 3]
    _, binary = cv2.threshold(alpha, 127, 255, cv2.THRESH_BINARY)

    # Morphological close to fill small holes
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel, iterations=2)

    # Find contours
    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    if not contours:
        logger.warning("No contour found in %s", trimmed_png_path)
        return None

    # Largest contour
    cnt = max(contours, key=cv2.contourArea)

    # approxPolyDP
    arc = cv2.arcLength(cnt, closed=True)
    epsilon = epsilon_ratio * arc
    approx = cv2.approxPolyDP(cnt, epsilon, closed=True)

    # Chaikin smoothing
    pts = approx.reshape(-1, 2).astype(np.float64)
    pts = _chaikin(pts, iterations=2)

    # Re-simplify after smoothing
    pts_int = pts.reshape(-1, 1, 2).astype(np.int32)
    pts_int = cv2.approxPolyDP(pts_int, epsilon * 0.5, closed=True)
    pts = pts_int.reshape(-1, 2).astype(np.float64)

    # Dominant edge colour (use original 256×256 RGBA)
    edge_color = _dominant_edge_color(rgba, pts_int)

    # Normalise to [0, 1]
    normalised = [
        {"x": float(p[0] / CONTOUR_SIZE), "y": float(p[1] / CONTOUR_SIZE)}
        for p in pts
    ]

    # Perimeter in mm: scale pixel perimeter → real-world
    # Pixel scale: CONTOUR_SIZE pixels represents height_cm cm
    px_per_mm = CONTOUR_SIZE / (height_cm * 10.0)
    perimeter_px = sum(
        np.linalg.norm(pts[(i + 1) % len(pts)] - pts[i]) for i in range(len(pts))
    )
    perimeter_mm = float(perimeter_px / px_per_mm)

    logger.info(
        "Contour extracted — %d points, perimeter=%.1fmm, edge=%s",
        len(normalised), perimeter_mm, edge_color,
    )

    return ContourResult(
        points=normalised,
        perimeter_mm=perimeter_mm,
        edge_color_hex=edge_color,
        smoothness=smoothness,
    )
