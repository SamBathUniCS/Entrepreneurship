from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.event import Event
from app.models.event_member import EventMember
from app.models.photo import Photo
from app.models.user import User
from app.services import shotstack, storage

router = APIRouter(prefix="/events/{event_id}/renders", tags=["renders"])


class RenderRequest(BaseModel):
    type: str                          # "montage" | "reel"
    music: str = "chill"               # "chill" | "upbeat" | "cinematic" (reel only)
    photo_ids: list[str] | None = None # specific photo IDs to include; None = all


@router.post("/", status_code=202)
async def create_render(
    event_id: UUID,
    req: RenderRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Kick off a Shotstack render for the event gallery photos.
    Photos are downloaded from MinIO and uploaded to Shotstack's media library,
    so no public MinIO URL is required.
    Returns a render_id to poll with GET /renders/{render_id}.
    """
    if req.type not in ("montage", "reel"):
        raise HTTPException(status_code=400, detail="type must be 'montage' or 'reel'")

    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    membership = db.query(EventMember).filter(
        EventMember.event_id == event_id,
        EventMember.user_id == current_user.id,
    ).first()
    if not membership:
        raise HTTPException(status_code=403, detail="You are not a member of this event")

    max_photos = 12 if req.type == "montage" else 20

    if req.photo_ids:
        from uuid import UUID as _UUID
        ids = [_UUID(pid) for pid in req.photo_ids[:max_photos]]
        photos = (
            db.query(Photo)
            .filter(Photo.id.in_(ids), Photo.event_id == event_id, Photo.is_deleted == False)
            .all()
        )
    else:
        photos = (
            db.query(Photo)
            .filter(Photo.event_id == event_id, Photo.is_deleted == False)
            .order_by(Photo.created_at.desc())
            .limit(max_photos)
            .all()
        )

    if not photos:
        raise HTTPException(status_code=400, detail="No photos selected or available in this event")

    # Download each photo from MinIO, then upload to Shotstack's media library.
    # This avoids needing a publicly accessible MinIO URL.
    import logging
    logger = logging.getLogger(__name__)

    src_urls: list[str] = []
    for i, photo in enumerate(photos):
        if not photo.s3_key:
            continue
        try:
            image_bytes = storage.download_file(photo.s3_key)
            shotstack_url = await shotstack.upload_asset(
                image_bytes, filename=f"photo_{i}.jpg"
            )
            src_urls.append(shotstack_url)
        except Exception as e:
            logger.error("Failed to upload photo %s to Shotstack: %s", photo.s3_key, e)
            continue

    if not src_urls:
        raise HTTPException(
            status_code=400,
            detail="Could not upload any photos to Shotstack. Check SHOTSTACK_API_KEY.",
        )

    try:
        render_id = await shotstack.create_render(req.type, src_urls, req.music)
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))

    return {"render_id": render_id, "status": "queued", "photo_count": len(src_urls)}


@router.get("/{render_id}")
async def poll_render(
    event_id: UUID,
    render_id: str,
    current_user: User = Depends(get_current_user),
):
    """Poll a render job. Status: queued | fetching | rendering | done | failed."""
    try:
        result = await shotstack.poll_render(render_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
    return result
