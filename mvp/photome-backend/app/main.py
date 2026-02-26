from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.api.routes import auth, users, events, photos, admin
from app.api.deps import get_current_user, get_db
from app.core.config import get_settings
from app.models.photo import Photo
from app.models.user import User
from app.services import storage
from app.services.storage import ensure_bucket_exists

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        ensure_bucket_exists()
    except Exception as e:
        print(f"[WARNING] Could not initialise MinIO bucket on startup: {e}")
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PREFIX = settings.API_V1_PREFIX

app.include_router(auth.router,   prefix=PREFIX)
app.include_router(users.router,  prefix=PREFIX)
app.include_router(events.router, prefix=PREFIX)
app.include_router(photos.router, prefix=PREFIX)
app.include_router(admin.router,  prefix=PREFIX)


# ── File proxy — serves photos directly from MinIO through the API ─────────────
# This avoids all presigned URL / CORS / signature issues entirely.
# Browser requests /api/v1/photos/{id}/file → backend fetches from MinIO → streams to browser

@app.get("/api/v1/photos/{photo_id}/file")
def serve_photo_file(
    photo_id: str,
    thumb: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Stream a photo file from MinIO. Requires authentication."""
    from uuid import UUID
    try:
        pid = UUID(photo_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid photo ID")

    photo = db.query(Photo).filter(Photo.id == pid, Photo.is_deleted == False).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")

    s3_key = photo.s3_key_thumbnail if (thumb and photo.s3_key_thumbnail) else photo.s3_key

    try:
        file_bytes = storage.download_file(s3_key)
    except Exception as e:
        raise HTTPException(status_code=404, detail="File not found in storage")

    content_type = "image/jpeg" if thumb else (photo.content_type or "image/jpeg")

    import io
    return StreamingResponse(
        io.BytesIO(file_bytes),
        media_type=content_type,
        headers={"Cache-Control": "private, max-age=3600"},
    )


@app.get("/", tags=["root"])
def root():
    return {
        "app": settings.APP_NAME,
        "version": "0.1.0",
        "docs": "/docs",
        "health": f"{PREFIX}/admin/health",
    }
