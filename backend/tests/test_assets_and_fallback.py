import io
import pytest
from PIL import Image, ImageDraw

from app.core.config import get_settings
from app.services import segmentation
from app.services.contour import extract_contour
from app.services.segmentation import run_segmentation


def _create_object_on_white_png() -> bytes:
    img = Image.new("RGB", (200, 200), color=(245, 245, 245))
    draw = ImageDraw.Draw(img)
    draw.rectangle([55, 45, 145, 155], fill=(220, 45, 60))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


@pytest.mark.asyncio
async def test_grabcut_fallback_segmentation(tmp_path, monkeypatch):
    monkeypatch.setattr(segmentation, "_REMBG_AVAILABLE", False)

    src_path = tmp_path / "sample.png"
    src_path.write_bytes(_create_object_on_white_png())
    out_dir = tmp_path / "out"

    res = await run_segmentation(src_path, out_dir)
    assert res.engine_used == "OpenCV-GrabCut"
    assert res.trimmed_path.exists()
    assert res.preview_path.exists()
    assert res.solidity > 0.5
    assert res.crop_edge_quality >= 0.8

    trimmed = Image.open(res.trimmed_path).convert("RGBA")
    # Corners must be transparent
    assert trimmed.getpixel((0, 0))[3] == 0
    # Center must be opaque
    cw, ch = trimmed.size
    assert trimmed.getpixel((cw // 2, ch // 2))[3] > 200


@pytest.mark.asyncio
async def test_project_assets_endpoint_returns_base64_and_contour(client, tmp_path, monkeypatch):
    monkeypatch.setattr(segmentation, "_REMBG_AVAILABLE", False)

    img_bytes = _create_object_on_white_png()
    files = {"file": ("toy.png", img_bytes, "image/png")}
    headers = {"X-Device-ID": "dev-assets-test"}

    scan_resp = await client.post("/api/v1/projects/scan", files=files, headers=headers)
    assert scan_resp.status_code == 202
    data = scan_resp.json()
    project_id = data["project_id"]
    job_id = data["job_id"]

    # Ensure job completed (Starlette executes background tasks before response returns in AsyncClient,
    # or check job status directly)
    job_resp = await client.get(f"/api/v1/jobs/{job_id}")
    assert job_resp.status_code == 200
    assert job_resp.json()["status"] == "done"

    assets_resp = await client.get(f"/api/v1/projects/{project_id}/assets", headers=headers)
    assert assets_resp.status_code == 200
    assets = assets_resp.json()

    assert assets["project_id"] == project_id
    assert assets["engine_used"] == "OpenCV-GrabCut"
    assert assets["ai_source"] == "fallback"
    assert assets["ai_warning"]
    assert assets["trimmed_base64"].startswith("data:image/png;base64,")
    assert assets["preview_base64"].startswith("data:image/png;base64,")
    assert assets["contour"] is not None
    assert len(assets["contour"]["points"]) >= 4
    assert "x" in assets["contour"]["points"][0]
    assert "y" in assets["contour"]["points"][0]
    assert assets["perimeter_mm"] > 0
    assert assets["edge_color"].startswith("#")
