import io
import pytest
from PIL import Image


def _create_sample_image(format="JPEG", size=(100, 100)) -> bytes:
    buf = io.BytesIO()
    img = Image.new("RGB", size, color=(255, 0, 0))
    img.save(buf, format=format)
    return buf.getvalue()


@pytest.mark.asyncio
async def test_upload_missing_device_id(client):
    img_bytes = _create_sample_image()
    files = {"file": ("test.jpg", img_bytes, "image/jpeg")}
    response = await client.post("/api/v1/projects/scan", files=files)
    assert response.status_code == 422  # Missing required header


@pytest.mark.asyncio
async def test_upload_invalid_mime(client):
    files = {"file": ("test.txt", b"not an image", "text/plain")}
    headers = {"X-Device-ID": "test-device-123"}
    response = await client.post("/api/v1/projects/scan", files=files, headers=headers)
    assert response.status_code == 422
    assert "Unsupported format" in response.json()["detail"]


@pytest.mark.asyncio
async def test_upload_oversized_file(client, monkeypatch):
    from app.core.config import get_settings

    monkeypatch.setattr(get_settings(), "MAX_UPLOAD_BYTES", 500)
    img_bytes = _create_sample_image(size=(300, 300))
    files = {"file": ("large.jpg", img_bytes, "image/jpeg")}
    headers = {"X-Device-ID": "test-device-123"}
    response = await client.post("/api/v1/projects/scan", files=files, headers=headers)
    assert response.status_code == 413
    assert "File exceeds maximum" in response.json()["detail"]


@pytest.mark.asyncio
async def test_valid_scan_upload(client):
    img_bytes = _create_sample_image()
    files = {"file": ("craft.jpg", img_bytes, "image/jpeg")}
    headers = {"X-Device-ID": "test-device-123"}
    response = await client.post("/api/v1/projects/scan", files=files, headers=headers)
    assert response.status_code == 202
    data = response.json()
    assert "project_id" in data
    assert "job_id" in data
    assert data["status"] == "queued"
