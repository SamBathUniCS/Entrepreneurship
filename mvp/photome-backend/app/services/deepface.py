"""
Client for serengil/deepface:latest Docker image.

The latest DeepFace REST server (deepface serve) API:
  POST /represent
  Body: multipart/form-data with field "img" as a file upload
  OR:   JSON with {"img": "base64string", ...} — but the base64 must include
        the data URI prefix: "data:image/jpeg;base64,<data>"

We use multipart upload which is unambiguous across all versions.
"""
import base64
import math
import logging
import io
from typing import Any

import httpx

from app.core.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

DEEPFACE_TIMEOUT = 90.0


def _resize(image_bytes: bytes, max_px: int = 640) -> bytes:
    """Shrink to max_px on longest side before sending. Faster + avoids timeouts."""
    try:
        from PIL import Image
        img = Image.open(io.BytesIO(image_bytes))
        w, h = img.size
        if max(w, h) <= max_px:
            return image_bytes
        scale = max_px / max(w, h)
        img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS).convert("RGB")
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=92)
        result = buf.getvalue()
        logger.info(f"Resized {w}x{h}→{int(w*scale)}x{int(h*scale)}, {len(image_bytes)//1024}KB→{len(result)//1024}KB")
        return result
    except Exception as e:
        logger.warning(f"Resize failed: {e}")
        return image_bytes


async def _represent(image_bytes: bytes, detector: str) -> list[dict[str, Any]]:
    """
    Call DeepFace /represent via multipart form upload.
    This works across all versions of the deepface server.
    """
    async with httpx.AsyncClient(timeout=DEEPFACE_TIMEOUT) as client:
        try:
            # Send as multipart — most reliable across DeepFace versions
            files = {"img": ("photo.jpg", io.BytesIO(image_bytes), "image/jpeg")}
            data = {
                "model_name": settings.DEEPFACE_MODEL,
                "detector_backend": detector,
                "enforce_detection": "false",
                "align": "true",
            }
            resp = await client.post(
                f"{settings.DEEPFACE_URL}/represent",
                files=files,
                data=data,
            )
            logger.info(f"DeepFace /represent detector={detector} status={resp.status_code}")

            if resp.status_code != 200:
                logger.warning(f"DeepFace error: {resp.text[:300]}")
                # Fall back to JSON base64 if multipart not supported
                return await _represent_json(image_bytes, detector)

            data_resp = resp.json()
            logger.info(f"DeepFace response keys: {list(data_resp.keys())}")

            # Handle both response formats across versions
            results = (
                data_resp.get("results")           # v0.0.86+
                or data_resp.get("representations") # older
                or []
            )
            logger.info(f"Faces found: {len(results)} with detector={detector}")
            return results

        except Exception as e:
            logger.error(f"DeepFace multipart request failed: {e}")
            return await _represent_json(image_bytes, detector)


async def _represent_json(image_bytes: bytes, detector: str) -> list[dict[str, Any]]:
    """Fallback: JSON with data URI base64 — works with older deepface servers."""
    async with httpx.AsyncClient(timeout=DEEPFACE_TIMEOUT) as client:
        try:
            b64 = "data:image/jpeg;base64," + base64.b64encode(image_bytes).decode()
            resp = await client.post(
                f"{settings.DEEPFACE_URL}/represent",
                json={
                    "img": b64,
                    "model_name": settings.DEEPFACE_MODEL,
                    "detector_backend": detector,
                    "enforce_detection": False,
                    "align": True,
                },
            )
            logger.info(f"DeepFace JSON fallback status={resp.status_code} detector={detector}")
            if resp.status_code != 200:
                logger.warning(f"DeepFace JSON error: {resp.text[:300]}")
                return []
            data = resp.json()
            return data.get("results", data.get("representations", []))
        except Exception as e:
            logger.error(f"DeepFace JSON fallback failed: {e}")
            return []


async def detect_faces(image_bytes: bytes) -> list[dict[str, Any]]:
    """
    Try multiple detectors until one finds a face.
    Returns list of face dicts each containing 'embedding'.
    """
    image_bytes = _resize(image_bytes)
    detectors = ["retinaface", "opencv", "mtcnn", "skip"]
    # Put configured detector first
    if settings.DEEPFACE_DETECTOR not in detectors:
        detectors.insert(0, settings.DEEPFACE_DETECTOR)
    else:
        detectors.remove(settings.DEEPFACE_DETECTOR)
        detectors.insert(0, settings.DEEPFACE_DETECTOR)

    for detector in detectors:
        results = await _represent(image_bytes, detector)
        if results:
            return results
        logger.info(f"No faces with {detector}, trying next detector…")

    logger.warning("No faces found with any detector")
    return []


async def extract_embedding(image_bytes: bytes) -> list[float] | None:
    """Best single embedding for a selfie."""
    results = await detect_faces(image_bytes)
    if not results:
        return None
    best = max(results, key=lambda r: r.get("face_confidence", 0))
    emb = best.get("embedding")
    if emb:
        logger.info(f"Embedding extracted: {len(emb)} dimensions, confidence={best.get('face_confidence', 'n/a')}")
    return emb


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
