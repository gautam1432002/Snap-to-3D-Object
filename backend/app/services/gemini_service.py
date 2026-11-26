"""
app/services/gemini_service.py
──────────────────────────────
Official Google GenAI SDK integration with exponential backoff and timeouts.
Implements the 3 Gemini calls from PROJECT_SPEC.md §5:
1. Object metadata & classification (JSON response)
2. Dynamic outpainting / edge polish (image modality output)
3. Page 3 Cutout sheet generation (image modality output)

If GEMINI_API_KEY is not set or empty, provides deterministic safe fallbacks
so local development and offline unit tests run smoothly.
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

# Fallback response when GEMINI_API_KEY is empty
_FALLBACK_META = GeminiMetaResponse(
    object_name="Papercraft Subject",
    category="Decor / Character",
    suggested_name="Foldly Model",
    complexity="Medium",
    dominant_colors=["#4A90E2", "#F5A623", "#E94E77"],
    paper_size="A4",
    estimated_height_cm=18.0,
    is_safe=True,
)


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
  "object_name": "string (canonical name of subject, e.g. 'Red Fox', 'Vintage Espresso Machine')",
  "category": "string (e.g. 'Animal', 'Vehicle', 'Character', 'Decor')",
  "suggested_name": "string (a cute, creative product display title)",
  "complexity": "Easy" | "Medium" | "Hard" (Easy: smooth convex shape; Medium: moderate limbs/ears; Hard: high branching/slender details),
  "dominant_colors": ["#HEX1", "#HEX2", "#HEX3"],
  "paper_size": "A4",
  "estimated_height_cm": 18.0,
  "is_safe": true
}
Ensure dominant_colors contains 3 hex colors representative of the subject.
"""


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
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
        return _FALLBACK_META

    try:
        raw_json = _call_gemini_metadata_api(client, settings.GEMINI_TEXT_MODEL, image_bytes, mime)
        data = json.loads(raw_json)
        return GeminiMetaResponse(
            object_name=data.get("object_name", _FALLBACK_META.object_name),
            category=data.get("category", _FALLBACK_META.category),
            suggested_name=data.get("suggested_name", _FALLBACK_META.suggested_name),
            complexity=data.get("complexity", _FALLBACK_META.complexity),
            dominant_colors=data.get("dominant_colors", _FALLBACK_META.dominant_colors),
            paper_size=data.get("paper_size", "A4"),
            estimated_height_cm=float(data.get("estimated_height_cm", 18.0)),
            is_safe=bool(data.get("is_safe", True)),
        )
    except Exception as exc:
        logger.error("Gemini metadata call failed: %s. Returning fallback.", exc)
        return _FALLBACK_META


# ── Polish / Outpainting ──────────────────────────────────────────────────────

_POLISH_PROMPT = """
You are an expert digital artist repairing a clipped papercraft cutout.
This subject was cropped against photo edges.
Complete the missing natural extremities or outer contours of the subject on the cropped sides seamlessly.
The background must remain completely pure solid transparent or pure white so the subject can be cleanly cut out.
Keep the existing internal visual details and art style identical.
"""


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type(Exception),
    reraise=True,
)
def _call_gemini_image_api(client, model: str, prompt: str, image_bytes: Optional[bytes] = None, mime: str = "image/png") -> bytes:
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


async def polish_cutout(png_bytes: bytes, cropped_sides: list[str]) -> bytes:
    """
    Outpaint/repair cropped edges using Gemini Image Model.
    If no API key is available, returns the original input bytes unchanged.
    """
    client = _get_client()
    if not client:
        logger.info("GEMINI_API_KEY not configured. Returning original image for polish.")
        return png_bytes

    settings = get_settings()
    sides_str = ", ".join(cropped_sides) if cropped_sides else "outer boundaries"
    prompt = f"{_POLISH_PROMPT}\nPay particular attention to extending the cut-off areas on sides: {sides_str}."

    try:
        return _call_gemini_image_api(client, settings.GEMINI_IMAGE_MODEL, prompt, image_bytes=png_bytes)
    except Exception as exc:
        logger.error("Gemini polish call failed: %s. Returning unpolished image.", exc)
        return png_bytes


# ── Page 3 Cutout Sheet Generation ───────────────────────────────────────────

_SHEET_PROMPT = """
Generate an ultra-high resolution, clean papercraft flat-pack assembly component sheet for the character or model '{name}'.
The sheet is designed for standard {paper_size} printing.
Show:
1. The front silhouette and back side matching textured elements.
2. Interlocking stand flaps with clear dotted fold lines and solid cut lines.
3. Minimalist numbered assembly tabs (Tab A, Tab B).
All graphics must have crisp boundaries against an ultra clean solid white background.
"""


async def generate_cutout_sheet(png_bytes: bytes, name: str, paper_size: str = "A4") -> bytes:
    """
    Generate decorative / assembly cutout sheet using Gemini Image Model.
    If no API key is set, returns an annotated mockup template PNG based on input.
    """
    client = _get_client()
    if not client:
        logger.info("GEMINI_API_KEY not configured. Returning fallback cutout sheet.")
        # Create a simple fallback image
        img = Image.new("RGBA", (1200, 1600), (255, 255, 255, 255))
        try:
            subject = Image.open(io.BytesIO(png_bytes)).convert("RGBA")
            subject.thumbnail((800, 1000), Image.LANCZOS)
            img.paste(subject, (200, 300), subject)
        except Exception:
            pass
        out_buf = io.BytesIO()
        img.save(out_buf, "PNG")
        return out_buf.getvalue()

    settings = get_settings()
    prompt = _SHEET_PROMPT.format(name=name, paper_size=paper_size)
    try:
        return _call_gemini_image_api(client, settings.GEMINI_IMAGE_MODEL, prompt, image_bytes=png_bytes)
    except Exception as exc:
        logger.error("Gemini cutout sheet failed: %s. Returning fallback.", exc)
        img = Image.new("RGBA", (1200, 1600), (255, 255, 255, 255))
        out_buf = io.BytesIO()
        img.save(out_buf, "PNG")
        return out_buf.getvalue()
