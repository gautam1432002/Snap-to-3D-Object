"""
app/services/gemini_service.py
──────────────────────────────
Official Google GenAI SDK integration with automatic model fallback chains:
- Text metadata: config.GEMINI_TEXT_MODEL -> gemini-2.5-flash -> gemini-2.0-flash
- Image polish / sheet: config.GEMINI_IMAGE_MODEL -> gemini-2.5-flash-image -> gemini-2.0-flash-exp-image-generation

Returns explicit ai_source ("gemini" | "fallback") and ai_warning so the
mobile app can inform the user transparently if GEMINI_API_KEY is missing or fails.
"""
from __future__ import annotations

import io
import json
import logging
from typing import Optional

from PIL import Image
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.core.config import get_settings
from app.models.schemas import GeminiMetaResponse

logger = logging.getLogger(__name__)

_FALLBACK_TEXT_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash"]
_FALLBACK_IMAGE_MODELS = ["gemini-2.5-flash-image", "gemini-2.0-flash-exp-image-generation"]

_FALLBACK_META = GeminiMetaResponse(
    object_name="Papercraft Subject",
    category="Everyday",
    suggested_name="Custom Paper Craft",
    complexity="Medium",
    dominant_colors=["#2EC4B6", "#F4C430", "#E63946"],
    paper_size="A4",
    estimated_height_cm=18.0,
    is_safe=True,
    ai_source="fallback",
    ai_warning=None,
)


def _dedupe_models(primary: str, fallbacks: list[str]) -> list[str]:
    seen: list[str] = []
    for m in [primary, *fallbacks]:
        if m and m not in seen:
            seen.append(m)
    return seen


def _get_client():
    settings = get_settings()
    if not settings.GEMINI_API_KEY:
        return None
    try:
        from google import genai
        return genai.Client(api_key=settings.GEMINI_API_KEY)
    except Exception as exc:
        logger.warning("Could not initialize google-genai Client: %s", exc)
        return None


# ── Metadata Extraction ───────────────────────────────────────────────────────

_METADATA_PROMPT = """
You are an expert 3D papercraft and spatial packaging engineer.
Analyze this segmented cutout image of a subject intended for a 3D papercraft toy.
Respond strictly in JSON matching this exact structure:
{
  "object_name": "string (canonical name of subject, e.g. 'Red Fox', 'Vintage Sneaker')",
  "category": "string (one of: Signs, Style, Animals, Drinks, Toys, Everyday)",
  "suggested_name": "string (short friendly display title, max 26 chars)",
  "complexity": "Easy" | "Medium" | "Hard",
  "dominant_colors": ["#HEX1", "#HEX2", "#HEX3"],
  "paper_size": "A4",
  "estimated_height_cm": 18.0,
  "is_safe": true
}
Ensure dominant_colors contains 3 hex colors representative of the subject.
"""


@retry(
    stop=stop_after_attempt(2),
    wait=wait_exponential(multiplier=1, min=1, max=4),
    retry=retry_if_exception_type(Exception),
    reraise=True,
)
def _call_gemini_metadata_api(client, model: str, image_bytes: bytes, mime: str) -> str:
    from google.genai import types

    contents = [
        types.Part.from_bytes(data=image_bytes, mime_type=mime),
        types.Part.from_text(text=_METADATA_PROMPT),
    ]
    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        temperature=0.25,
    )
    response = client.models.generate_content(
        model=model,
        contents=contents,
        config=config,
    )
    return response.text


async def get_object_metadata(image_bytes: bytes, mime: str = "image/png") -> GeminiMetaResponse:
    settings = get_settings()
    client = _get_client()
    if not client:
        logger.info("GEMINI_API_KEY not configured. Using fallback metadata.")
        return _FALLBACK_META.model_copy(
            update={
                "ai_source": "fallback",
                "ai_warning": "GEMINI_API_KEY is missing in backend/.env — using offline fallback metadata.",
            }
        )

    models = _dedupe_models(settings.GEMINI_TEXT_MODEL, _FALLBACK_TEXT_MODELS)
    last_exc: Optional[Exception] = None

    for model_name in models:
        try:
            raw_json = _call_gemini_metadata_api(client, model_name, image_bytes, mime)
            cleaned = raw_json.replace("```json", "").replace("```", "").strip()
            data = json.loads(cleaned)
            return GeminiMetaResponse(
                object_name=data.get("object_name", _FALLBACK_META.object_name),
                category=data.get("category", _FALLBACK_META.category),
                suggested_name=data.get("suggested_name", _FALLBACK_META.suggested_name),
                complexity=data.get("complexity", _FALLBACK_META.complexity),
                dominant_colors=data.get("dominant_colors", _FALLBACK_META.dominant_colors),
                paper_size=data.get("paper_size", "A4"),
                estimated_height_cm=float(data.get("estimated_height_cm", 18.0)),
                is_safe=bool(data.get("is_safe", True)),
                ai_source="gemini",
                ai_warning=None,
            )
        except Exception as exc:
            last_exc = exc
            logger.warning("Gemini metadata model '%s' failed (%s); trying next fallback.", model_name, exc)

    logger.error("All Gemini metadata models failed (%s). Returning fallback.", last_exc)
    return _FALLBACK_META.model_copy(
        update={
            "ai_source": "fallback",
            "ai_warning": f"Gemini identification failed ({last_exc}); using fallback metadata.",
        }
    )


# ── Polish / Outpainting ──────────────────────────────────────────────────────

_POLISH_PROMPT = """
Restore and enhance this neural-isolated real-world object on a 100% pure solid white (#FFFFFF) background with zero cast shadows, zero floor, and zero background clutter.
Make the colors vibrant, sharp, and crisp, preserving the exact real object, symbols, text, and upright front-facing orientation ready for a crisp 3D paper-craft model.
"""


@retry(
    stop=stop_after_attempt(2),
    wait=wait_exponential(multiplier=1, min=1, max=4),
    retry=retry_if_exception_type(Exception),
    reraise=True,
)
def _call_gemini_image_api(
    client,
    model: str,
    prompt: str,
    image_bytes: Optional[bytes] = None,
    mime: str = "image/png",
) -> bytes:
    from google.genai import types

    contents = []
    if image_bytes:
        contents.append(types.Part.from_bytes(data=image_bytes, mime_type=mime))
    contents.append(types.Part.from_text(text=prompt))

    config = types.GenerateContentConfig(
        response_modalities=["IMAGE"],
    )
    response = client.models.generate_content(
        model=model,
        contents=contents,
        config=config,
    )
    for part in response.candidates[0].content.parts:
        if part.inline_data:
            return part.inline_data.data
    raise RuntimeError("No image returned in Gemini response.")


async def polish_cutout_with_status(
    png_bytes: bytes,
    cropped_sides: list[str],
) -> tuple[bytes, str, Optional[str]]:
    """
    Outpaint/repair cropped edges using Gemini Image Model fallback chain.
    Returns (png_bytes, ai_source, ai_warning).
    """
    client = _get_client()
    if not client:
        logger.info("GEMINI_API_KEY not configured. Returning original image for polish.")
        return (
            png_bytes,
            "fallback",
            "GEMINI_API_KEY is missing in backend/.env — AI edge polish requires a Gemini API key.",
        )

    settings = get_settings()
    sides_str = ", ".join(cropped_sides) if cropped_sides else "outer boundaries"
    prompt = f"{_POLISH_PROMPT}\nPay particular attention to extending cut-off areas on sides: {sides_str}."

    models = _dedupe_models(settings.GEMINI_IMAGE_MODEL, _FALLBACK_IMAGE_MODELS)
    last_exc: Optional[Exception] = None
    for model_name in models:
        try:
            out_bytes = _call_gemini_image_api(client, model_name, prompt, image_bytes=png_bytes)
            return out_bytes, "gemini", None
        except Exception as exc:
            last_exc = exc
            logger.warning("Gemini polish model '%s' failed (%s); trying next fallback.", model_name, exc)

    logger.error("All Gemini polish models failed: %s", last_exc)
    return png_bytes, "fallback", f"Gemini polish failed ({last_exc}); kept original cutout."


async def polish_cutout(png_bytes: bytes, cropped_sides: list[str]) -> bytes:
    out_bytes, _, _ = await polish_cutout_with_status(png_bytes, cropped_sides)
    return out_bytes


# ── Page 3 Cutout Sheet Generation ───────────────────────────────────────────

_SHEET_PROMPT = """
Create a clean, flat, top-down printable 2D papercraft cutout template sheet on pure white {paper_size} printing paper for the exact "{name}" shown in the attached neural cutout image.
Requirements:
- Pure white flat paper background (#FFFFFF) with no 3D perspective, no table, no hands, no shadows.
- Draw the unfolded flat papercraft pieces cleanly arranged on the page: crisp vibrant Front face, matching mirrored Back face, connected Side depth strips, and a fold-out base stand.
- Draw clear SOLID RED outer cutting lines around every piece.
- Draw clear DASHED BLUE inner folding lines where the paper bends.
- Include light-pink trapezoidal GLUE TABS with matching numbers (1, 2, 3, 4).
- Include a clean header "{name} - PAPER CRAFT CUTOUT" and a "Red = Cut | Blue = Fold" legend at the bottom.
"""


def _build_local_fallback_sheet(png_bytes: bytes) -> bytes:
    img = Image.new("RGBA", (1200, 1600), (255, 255, 255, 255))
    try:
        subject = Image.open(io.BytesIO(png_bytes)).convert("RGBA")
        subject.thumbnail((720, 900), Image.LANCZOS)
        x_off = (1200 - subject.width) // 2
        y_off = (1600 - subject.height) // 2
        img.paste(subject, (x_off, y_off), subject)
    except Exception:
        pass
    out_buf = io.BytesIO()
    img.save(out_buf, "PNG")
    return out_buf.getvalue()


async def generate_cutout_sheet_with_status(
    png_bytes: bytes,
    name: str,
    paper_size: str = "A4",
) -> tuple[bytes, str, Optional[str]]:
    """
    Generate decorative / assembly cutout sheet using Gemini Image Model fallback chain.
    Returns (sheet_png_bytes, ai_source, ai_warning).
    """
    client = _get_client()
    if not client:
        logger.info("GEMINI_API_KEY not configured. Returning fallback cutout sheet.")
        return (
            _build_local_fallback_sheet(png_bytes),
            "fallback",
            "GEMINI_API_KEY is missing in backend/.env — showing local sheet preview.",
        )

    settings = get_settings()
    prompt = _SHEET_PROMPT.format(name=name, paper_size=paper_size)
    models = _dedupe_models(settings.GEMINI_IMAGE_MODEL, _FALLBACK_IMAGE_MODELS)
    last_exc: Optional[Exception] = None

    for model_name in models:
        try:
            out_bytes = _call_gemini_image_api(client, model_name, prompt, image_bytes=png_bytes)
            return out_bytes, "gemini", None
        except Exception as exc:
            last_exc = exc
            logger.warning("Gemini sheet model '%s' failed (%s); trying next fallback.", model_name, exc)

    logger.error("All Gemini cutout sheet models failed: %s", last_exc)
    return (
        _build_local_fallback_sheet(png_bytes),
        "fallback",
        f"Gemini sheet generation failed ({last_exc}); showing local sheet preview.",
    )


async def generate_cutout_sheet(png_bytes: bytes, name: str, paper_size: str = "A4") -> bytes:
    out_bytes, _, _ = await generate_cutout_sheet_with_status(png_bytes, name=name, paper_size=paper_size)
    return out_bytes
