import io
import pytest
from PIL import Image

from app.core.config import get_settings
from app.services.gemini_service import (
    generate_cutout_sheet,
    get_object_metadata,
    polish_cutout,
)


@pytest.mark.asyncio
async def test_gemini_fallback_when_api_key_empty(monkeypatch):
    monkeypatch.setattr(get_settings(), "GEMINI_API_KEY", "")

    # Dummy image bytes
    buf = io.BytesIO()
    Image.new("RGBA", (100, 100), (255, 100, 50, 255)).save(buf, "PNG")
    raw_bytes = buf.getvalue()

    # 1. Metadata fallback test
    meta = await get_object_metadata(raw_bytes, "image/png")
    assert meta.object_name != ""
    assert meta.complexity in ["Easy", "Medium", "Hard"]
    assert len(meta.dominant_colors) >= 1
    assert meta.estimated_height_cm > 0

    # 2. Polish fallback test (should return input bytes unchanged)
    polished = await polish_cutout(raw_bytes, cropped_sides=["bottom", "left"])
    assert polished == raw_bytes

    # 3. Sheet fallback test (should return a valid generated PNG)
    sheet = await generate_cutout_sheet(raw_bytes, name="Toy Bot", paper_size="A4")
    assert len(sheet) > 0
    parsed_sheet = Image.open(io.BytesIO(sheet))
    assert parsed_sheet.format == "PNG"
