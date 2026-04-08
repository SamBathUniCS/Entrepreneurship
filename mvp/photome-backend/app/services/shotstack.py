"""
Shotstack API client — renders image montages (GIF) and reels (MP4 with music).

Key design: photos are downloaded from MinIO by the backend, then uploaded to
Shotstack's own media library. This means Shotstack never needs to reach our
private MinIO — no public URL required.

Docs: https://shotstack.io/docs/api/
"""
import io
import httpx

from app.core.config import get_settings

settings = get_settings()

SHOTSTACK_BASE = "https://api.shotstack.io"

MUSIC_TRACKS = {
    "chill":     "https://shotstack-assets.s3-ap-southeast-2.amazonaws.com/music/dreams.mp3",
    "upbeat":    "https://shotstack-assets.s3-ap-southeast-2.amazonaws.com/music/gangsta.mp3",
    "cinematic": "https://shotstack-assets.s3-ap-southeast-2.amazonaws.com/music/freeflow.mp3",
}


def _headers() -> dict:
    return {
        "x-api-key": settings.SHOTSTACK_API_KEY,
        "Accept": "application/json",
    }


def _base() -> str:
    return f"{SHOTSTACK_BASE}/edit/{settings.SHOTSTACK_ENV}"


# ── Asset upload ──────────────────────────────────────────────────────────────

async def upload_asset(image_bytes: bytes, filename: str = "photo.jpg") -> str:
    """
    Upload image bytes to Shotstack's media library.
    Returns a Shotstack-hosted URL safe to use as a clip src.
    """
    url = f"{_base()}/assets"
    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post(
            url,
            headers=_headers(),
            files={"file": (filename, io.BytesIO(image_bytes), "image/jpeg")},
        )
        if r.status_code not in (200, 201):
            raise RuntimeError(f"Shotstack asset upload error {r.status_code}: {r.text}")
        data = r.json()
        # Response: {"data": {"attributes": {"url": "..."}}}
        return data["data"]["attributes"]["url"]


# ── Payload builders ──────────────────────────────────────────────────────────

def _build_montage_payload(src_urls: list[str]) -> dict:
    """Animated GIF: each photo shown for 1.5 s with fade transitions."""
    clips = [
        {
            "asset": {"type": "image", "src": url},
            "start": round(i * 1.5, 1),
            "length": 1.5,
            "transitions": {"in": {"type": "fade"}, "out": {"type": "fade"}},
        }
        for i, url in enumerate(src_urls[:12])
    ]
    return {
        "timeline": {
            "background": "#000000",
            "tracks": [{"clips": clips}],
        },
        "output": {
            "format": "gif",
            "fps": 6,
            "size": {"width": 640, "height": 640},
        },
    }


def _build_reel_payload(src_urls: list[str], music_key: str) -> dict:
    """Portrait MP4 reel: each photo 3 s with zoom effect and music."""
    music_url = MUSIC_TRACKS.get(music_key, MUSIC_TRACKS["chill"])
    clips = [
        {
            "asset": {"type": "image", "src": url},
            "start": round(i * 3.0, 1),
            "length": 3.0,
            "effects": [{"type": "zoomIn"}],
            "transitions": {"in": {"type": "fade"}, "out": {"type": "fade"}},
        }
        for i, url in enumerate(src_urls[:20])
    ]
    return {
        "timeline": {
            "soundtrack": {
                "src": music_url,
                "effect": "fadeOut",
                "volume": 0.8,
            },
            "background": "#000000",
            "tracks": [{"clips": clips}],
        },
        "output": {
            "format": "mp4",
            "fps": 25,
            "size": {"width": 1080, "height": 1920},
        },
    }


# ── Render lifecycle ──────────────────────────────────────────────────────────

async def create_render(
    render_type: str,
    src_urls: list[str],
    music: str = "chill",
) -> str:
    """Submit a render job. Returns the render_id to poll."""
    if not settings.SHOTSTACK_API_KEY:
        raise RuntimeError("SHOTSTACK_API_KEY is not configured")

    payload = (
        _build_montage_payload(src_urls)
        if render_type == "montage"
        else _build_reel_payload(src_urls, music)
    )

    url = f"{_base()}/render"
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(
            url,
            json=payload,
            headers={**_headers(), "Content-Type": "application/json"},
        )
        if r.status_code not in (200, 201):
            raise RuntimeError(f"Shotstack render error {r.status_code}: {r.text}")
        return r.json()["response"]["id"]


async def poll_render(render_id: str) -> dict:
    """
    Poll a render job.
    Returns {"status": "queued|fetching|rendering|done|failed", "url": str|None}
    """
    if not settings.SHOTSTACK_API_KEY:
        raise RuntimeError("SHOTSTACK_API_KEY is not configured")

    url = f"{_base()}/render/{render_id}"
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(url, headers=_headers())
        r.raise_for_status()
        resp = r.json()["response"]
        return {
            "status": resp["status"],
            "url": resp.get("url"),
        }
