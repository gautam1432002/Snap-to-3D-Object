from pathlib import Path
from PIL import Image, ImageDraw
import pytest

from app.services.contour import extract_contour


def test_contour_on_synthetic_shape(tmp_path: Path):
    # Create a synthetic 256x256 RGBA image with a solid filled circle in center
    img = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    # Circle with cyan fill
    draw.ellipse([40, 40, 216, 216], fill=(0, 200, 255, 255))
    test_path = tmp_path / "synthetic_circle.png"
    img.save(test_path, "PNG")

    result = extract_contour(test_path, smoothness="Medium", height_cm=18.0)

    assert result is not None
    assert len(result.points) >= 8
    # Points should be normalized in [0, 1]
    for pt in result.points:
        assert 0.0 <= pt["x"] <= 1.0
        assert 0.0 <= pt["y"] <= 1.0

    assert result.perimeter_mm > 0.0
    assert result.edge_color_hex.startswith("#")
    assert len(result.edge_color_hex) == 7
    assert result.smoothness == "Medium"
