from uuid import UUID
import logging

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.event import Event
from app.models.event_member import EventMember
from app.models.friendship import FaceEmbedding
from app.models.photo import Photo, PhotoTag
from app.models.user import User
from app.services import deepface as df, photo_service, storage

router = APIRouter(prefix="/events/{event_id}/photos", tags=["photos"])
logger = logging.getLogger(__name__)

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic"}


def _resolve_event_and_membership(event_id, current_user, db):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    membership = db.query(EventMember).filter(
        EventMember.event_id == event_id,
        EventMember.user_id == current_user.id,
    ).first()
    if not membership:
        raise HTTPException(status_code=403, detail="You are not a member of this event")
    return event, membership


def _photo_url(photo_id: str, event_id: str, thumb: bool = False) -> str:
    """Build a URL that goes through our own backend proxy — no presigned URLs needed."""
    suffix = "?thumb=1" if thumb else ""
    return f"/api/v1/photos/{photo_id}/file{suffix}"


def _gallery_photos_query(event: Event, db: Session):
    """
    here we filtered the event gallery to show the actual content
    instead of showing every upload, we are showing the photos uploded by the event every createor 
    """
    return (

        db.query(Photo)
        .outerjoin(
            EventMember,
            (EventMember.event_id == Photo.event_id)

            & (EventMember.user_id == Photo.uploader_id),
        )
        .filter(
            Photo.event_id ==  event.id,
            Photo.is_deleted == False,
            (
                (Photo.uploader_id == event.creator_id)
                | (EventMember.is_photographer == True)

            ),
        )
    )


def _enrich_photo(photo: Photo, current_user: User) -> dict:
    return {
        "id": str(photo.id),
        "event_id": str(photo.event_id),
        "uploader_id": str(photo.uploader_id),
        "original_filename": photo.original_filename,
        "content_type": photo.content_type,
        "width": photo.width,
        "height": photo.height,
        "file_size_bytes": photo.file_size_bytes,
        "resolution_tier": photo.resolution_tier,
        "created_at": photo.created_at.isoformat(),
        "url": _photo_url(str(photo.id), str(photo.event_id)),
        "thumbnail_url": _photo_url(str(photo.id), str(photo.event_id), thumb=True) if photo.s3_key_thumbnail else None,
        "detected_faces": photo.detected_faces,
        "tags": [
            {
                "user_id": str(t.user_id),
                "username": t.user.username if t.user else str(t.user_id),
                "confidence": t.confidence,
                "tag_source": t.tag_source,
                "confirmed": t.confirmed,
            }
            for t in photo.tags
        ],
    }


# ── IMPORTANT: specific routes BEFORE /{photo_id} ─────────────────────────────

@router.post("/rescan")
async def rescan_photos(
    event_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Re-run face recognition on all existing photos. Use after registering a selfie."""
    _resolve_event_and_membership(event_id, current_user, db)

    photos = db.query(Photo).filter(
        Photo.event_id == event_id,
        Photo.is_deleted == False,
    ).all()

    all_embeddings = db.query(FaceEmbedding).all()
    logger.info(f"Rescan: found {len(all_embeddings)} face embeddings in DB")
    if not all_embeddings:
        return {"processed": 0, "new_tags": 0, "message": "No face embeddings registered — upload a selfie first"}

    processed = 0
    new_tags = 0
    logger.info(f"Rescan: processing {len(photos)} photos in event {event_id}")

    for photo in photos:
        try:
            file_bytes = storage.download_file(photo.s3_key)
        except Exception:
            continue

        face_results = await df.detect_faces(file_bytes)
        processed += 1
        logger.info(f"Photo {photo.id}: DeepFace found {len(face_results)} faces")

        for face in face_results:
            detected_emb = face.get("embedding")
            if not detected_emb:
                continue
            for emb_record in all_embeddings:
                matched, distance = df.is_match(detected_emb, emb_record.embedding)
                if not matched:
                    continue
                tagged_user = db.query(User).filter(User.id == emb_record.user_id).first()
                if not tagged_user or not tagged_user.face_recognition_enabled:
                    continue
                exists = db.query(PhotoTag).filter(
                    PhotoTag.photo_id == photo.id,
                    PhotoTag.user_id == tagged_user.id,
                ).first()
                if exists:
                    continue
                db.add(PhotoTag(
                    photo_id=photo.id,
                    user_id=tagged_user.id,
                    confidence=round(1.0 - distance, 4),
                    tag_source="auto",
                ))
                new_tags += 1
                logger.info(f"Tagged user {tagged_user.username} in photo {photo.id} (confidence={round(1.0 - distance, 4)})")

    db.commit()
    return {
        "processed": processed,
        "new_tags": new_tags,
        "message": f"Scanned {processed} photos, found {new_tags} new face matches",
    }


@router.get("/my", response_model=list[dict])
def my_photos_in_event(
    event_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _resolve_event_and_membership(event_id, current_user, db)
    photos = (
        db.query(Photo)
        .join(PhotoTag, PhotoTag.photo_id == Photo.id)
        .filter(
            PhotoTag.user_id == current_user.id,
            Photo.event_id == event_id,
            Photo.is_deleted == False,
        )
        .all()
    )
    return [_enrich_photo(p, current_user) for p in photos]


@router.get("/", response_model=list[dict])
def list_photos(
    event_id: UUID,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    event, membership = _resolve_event_and_membership(event_id, current_user, db)

    # updated to the user filtered gallery helper function, rather than fetiching all event photos
    photos = (
        _gallery_photos_query(event, db)
        .order_by(Photo.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    if not membership.has_access and current_user.tier == "basic":
        return [
            {
                "id": str(p.id),
                "event_id": str(p.event_id),
                "uploader_id": str(p.uploader_id),
                "thumbnail_url": _photo_url(str(p.id), str(p.event_id), thumb=True) if p.s3_key_thumbnail else None,
                "url": _photo_url(str(p.id), str(p.event_id)),
                "locked": True,
                "created_at": p.created_at.isoformat(),
            }
            for p in photos
        ]
    return [_enrich_photo(p, current_user) for p in photos]


@router.post("/", status_code=201)
async def upload_photo(
    event_id: UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    event, membership = _resolve_event_and_membership(event_id, current_user, db)

    if event.status != "active":
        raise HTTPException(status_code=400, detail="Cannot upload to an ended/archived event")

    if not file.content_type or file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {file.content_type}")

    file_bytes = await file.read()
    if len(file_bytes) > 20 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum 20 MB.")

    photo, upload_count, has_access, tagged_users = await photo_service.handle_photo_upload(
        db=db, event=event, uploader=current_user,
        file_bytes=file_bytes,
        filename=file.filename or "upload.jpg",
        content_type=file.content_type,
    )

    return {
        "photo": _enrich_photo(photo, current_user),
        "upload_count": upload_count,
        "has_access": has_access,
        "threshold": event.upload_threshold,
        "faces_detected": len(photo.detected_faces or []),
        "tagged_users": [u.username for u, _ in tagged_users],
    }


@router.delete("/{photo_id}", status_code=204)
def delete_photo(
    event_id: UUID,
    photo_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    photo = db.query(Photo).filter(Photo.id == photo_id, Photo.event_id == event_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    event = db.query(Event).filter(Event.id == event_id).first()
    if photo.uploader_id != current_user.id and event.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorised to delete this photo")
    photo.is_deleted = True
    db.commit()
