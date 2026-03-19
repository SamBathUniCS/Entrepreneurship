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
    type: str   # "montage" | "reel"
    music: str = "chill"  # "chill" | "upbeat" | "cinematic" (reel only)


@router.post("/", status_code=202)
async def create_render(
    event_id: UUID,
    req: RenderRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Kick off a Shotstack render for the event gallery.
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

    photos = (
        db.query(Photo)
        .filter(Photo.event_id == event_id, Photo.is_deleted == False)
        .order_by(Photo.created_at.desc())
        .limit(20)
        .all()
    )
    if not photos:
        raise HTTPException(status_code=400, detail="No photos in this event yet")

    # Presigned URLs so Shotstack (external) can download from MinIO.
    # NOTE: S3_PUBLIC_URL must be publicly reachable for this to work.
    # In dev use ngrok: `ngrok http 9000` and set S3_PUBLIC_URL accordingly.
    photo_urls = [
        storage.generate_presigned_url(p.s3_key, expires_in=3600)
        for p in photos
        if p.s3_key
    ]
    photo_urls = [u for u in photo_urls if u]

    if not photo_urls:
        raise HTTPException(status_code=400, detail="Could not generate photo URLs")

    try:
        render_id = await shotstack.create_render(req.type, photo_urls, req.music)
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))

    return {"render_id": render_id, "status": "queued"}


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
