"""
Client for the DeepFace microservice (serengil/deepface).

DeepFace REST API /represent endpoint accepts:
  - img: base64 encoded image (raw base64, no data URI prefix)
  - model_name: "Facenet512"
  - detector_backend: "opencv" | "retinaface" | "mtcnn" | "skip"
  - enforce_detection: false = return empty list instead of error when no face found

Response: {"results": [{"embedding": [...], "facial_area": {...}, "face_confidence": 0.9}]}
"""
import base64
import math
import logging
from typing import Any

import httpx

from app.core.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

DEEPFACE_TIMEOUT = 60.0


def _to_b64(image_bytes: bytes) -> str:
    """Plain base64, no data URI prefix."""
    return base64.b64encode(image_bytes).decode("utf-8")


def _resize_for_deepface(image_bytes: bytes, max_px: int = 800) -> bytes:
    """
    Resize image so the longest side is max_px.
    DeepFace doesn't need high-res — smaller = faster + less likely to timeout.
    Returns original bytes if PIL fails or image is already small enough.
    """
    try:
        from PIL import Image
        import io
        img = Image.open(io.BytesIO(image_bytes))
        w, h = img.size
        if max(w, h) <= max_px:
            return image_bytes  # already small enough
        scale = max_px / max(w, h)
        new_size = (int(w * scale), int(h * scale))
        img = img.resize(new_size, Image.LANCZOS).convert("RGB")
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=90)
        resized = buf.getvalue()
        logger.info(f"Resized image {w}x{h} → {new_size[0]}x{new_size[1]} ({len(image_bytes)//1024}KB → {len(resized)//1024}KB)")
        return resized
    except Exception as e:
        logger.warning(f"Could not resize image: {e}")
        return image_bytes


async def detect_faces(image_bytes: bytes) -> list[dict[str, Any]]:
    """
    Send image to DeepFace /represent.
    Tries multiple detectors in order until one finds a face.
    Returns list of face dicts with 'embedding' key, or [] if none found.
    """
    # Try progressively more lenient detectors
    detectors = [settings.DEEPFACE_DETECTOR, "retinaface", "mtcnn", "skip"]
    # deduplicate while preserving order
    seen = set()
    detectors = [d for d in detectors if not (d in seen or seen.add(d))]

    for detector in detectors:
        results = await _call_represent(image_bytes, detector)
        if results:
            logger.info(f"DeepFace found {len(results)} face(s) using detector={detector}")
            return results
        logger.info(f"DeepFace found 0 faces with detector={detector}, trying next…")

    logger.warning("DeepFace found no faces with any detector")
    return []


async def _call_represent(image_bytes: bytes, detector: str) -> list[dict[str, Any]]:
    """Single call to /represent with a specific detector."""
    async with httpx.AsyncClient(timeout=DEEPFACE_TIMEOUT) as client:
        try:
            resized = _resize_for_deepface(image_bytes)
            payload = {
                "img": _to_b64(resized),
                "model_name": settings.DEEPFACE_MODEL,
                "detector_backend": detector,
                "enforce_detection": False,
                "align": True,
            }
            resp = await client.post(
                f"{settings.DEEPFACE_URL}/represent",
                json=payload,
            )
            logger.info(f"DeepFace /represent status={resp.status_code} detector={detector}")
            if resp.status_code != 200:
                logger.warning(f"DeepFace error body: {resp.text[:500]}")
                return []
            data = resp.json()
            logger.info(f"DeepFace response keys: {list(data.keys())}")
            results = data.get("results", [])
            return results
        except Exception as e:
            logger.error(f"DeepFace request failed: {e}")
            return []


async def extract_embedding(image_bytes: bytes) -> list[float] | None:
    """Extract best single embedding for a selfie. Returns None only if all detectors fail."""
    results = await detect_faces(image_bytes)
    if not results:
        return None
    # Pick face with highest confidence
    best = max(results, key=lambda r: r.get("face_confidence", 0))
    return best.get("embedding")


def cosine_distance(a: list[float], b: list[float]) -> float:
    dot    = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(x * x for x in b))
    if norm_a == 0 or norm_b == 0:
        return 1.0
    return 1.0 - dot / (norm_a * norm_b)


def is_match(a: list[float], b: list[float]) -> tuple[bool, float]:
    dist = cosine_distance(a, b)
    return dist <= settings.DEEPFACE_DISTANCE_THRESHOLD, dist


async def health_check() -> bool:
    async with httpx.AsyncClient(timeout=5.0) as client:
        try:
            resp = await client.get(f"{settings.DEEPFACE_URL}/")
            return resp.status_code < 500
        except httpx.HTTPError:
            return False
