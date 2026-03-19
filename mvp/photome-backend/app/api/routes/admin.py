from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.core.config import get_settings
from app.models.event import Event
from app.models.event_member import EventMember
from app.models.friendship import FaceEmbedding
from app.models.photo import Photo, PhotoTag
from app.models.user import User
from app.services import deepface as df
from app.services.storage import ensure_bucket_exists, generate_presigned_url

router = APIRouter(prefix="/admin", tags=["admin"])
settings = get_settings()


@router.get("/health")
async def health():
    return {"status": "ok", "app": settings.APP_NAME}


@router.get("/deepface/health")
async def deepface_health():
    ok = await df.health_check()
    return {"deepface_reachable": ok, "url": settings.DEEPFACE_URL}


@router.post("/storage/init")
def init_storage(_: User = Depends(get_current_user)):
    try:
        ensure_bucket_exists()
        return {"message": f"Bucket '{settings.S3_BUCKET}' is ready"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/users/me/tier")
def upgrade_tier(
    tier: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if tier not in ("basic", "pro", "business"):
        raise HTTPException(status_code=400, detail="tier must be: basic | pro | business")
    current_user.tier = tier
    db.commit()
    return {"message": f"Tier updated to {tier}", "tier": tier}


# ── Developer inspection endpoints ──────────────────────────────────────────────

@router.get("/dev/summary")
def dev_summary(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    """Quick counts of everything in the system."""
    return {
        "users": db.query(User).count(),
        "users_with_face": db.query(FaceEmbedding).count(),
        "events": db.query(Event).count(),
        "active_events": db.query(Event).filter(Event.status == "active").count(),
        "photos": db.query(Photo).filter(Photo.is_deleted == False).count(),
        "photo_tags": db.query(PhotoTag).count(),
        "event_members": db.query(EventMember).count(),
    }


@router.get("/dev/users")
def dev_list_users(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    """All registered users with full details."""
    users = db.query(User).order_by(User.created_at.desc()).all()
    result = []
    for u in users:
        emb = db.query(FaceEmbedding).filter(FaceEmbedding.user_id == u.id).first()
        result.append({
            "id": str(u.id),
            "email": u.email,
            "username": u.username,
            "full_name": u.full_name,
            "tier": u.tier,
            "is_active": u.is_active,
            "total_uploads": u.total_uploads,
            "face_recognition_enabled": u.face_recognition_enabled,
            "recognition_scope": u.recognition_scope,
            "has_face_embedding": emb is not None,
            "selfie_url": generate_presigned_url(emb.selfie_s3_key) if emb and emb.selfie_s3_key else None,
            "created_at": u.created_at.isoformat(),
        })
    return {"count": len(result), "users": result}


@router.get("/dev/events")
def dev_list_events(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    """All events with counts."""
    events = db.query(Event).order_by(Event.created_at.desc()).all()
    result = []
    for e in events:
        creator = db.query(User).filter(User.id == e.creator_id).first()
        member_count = db.query(EventMember).filter(EventMember.event_id == e.id).count()
        photo_count = db.query(Photo).filter(Photo.event_id == e.id, Photo.is_deleted == False).count()
        result.append({
            "id": str(e.id),
            "title": e.title,
            "description": e.description,
            "status": e.status,
            "visibility": e.visibility,
            "creator": creator.username if creator else None,
            "max_attendees": e.max_attendees,
            "member_count": member_count,
            "photo_count": photo_count,
            "upload_threshold": e.upload_threshold,
            "created_at": e.created_at.isoformat(),
        })
    return {"count": len(result), "events": result}



@router.get("/dev/embeddings")
def debug_embeddings(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Debug: show all face embeddings in the system."""
    from app.models.friendship import FaceEmbedding
    embeddings = db.query(FaceEmbedding).all()
    return [
        {
            "user_id": str(e.user_id),
            "has_embedding": e.embedding is not None,
            "embedding_dims": len(e.embedding) if e.embedding else 0,
            "model": e.model_name,
            "selfie_key": e.selfie_s3_key,
        }
        for e in embeddings
    ]

@router.get("/dev/photos")
def dev_list_photos(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    """All photos with presigned URLs and face tag details."""
    photos = db.query(Photo).filter(Photo.is_deleted == False).order_by(Photo.created_at.desc()).all()
    result = []
    for p in photos:
        uploader = db.query(User).filter(User.id == p.uploader_id).first()
        event = db.query(Event).filter(Event.id == p.event_id).first()
        tags = db.query(PhotoTag).filter(PhotoTag.photo_id == p.id).all()
        tagged_users = []
        for t in tags:
            u = db.query(User).filter(User.id == t.user_id).first()
            tagged_users.append({
                "username": u.username if u else str(t.user_id),
                "confidence": round(t.confidence, 4) if t.confidence else None,
                "tag_source": t.tag_source,
                "confirmed": t.confirmed,
            })
        result.append({
            "id": str(p.id),
            "event_title": event.title if event else None,
            "event_id": str(p.event_id),
            "uploader": uploader.username if uploader else None,
            "filename": p.original_filename,
            "content_type": p.content_type,
            "width": p.width,
            "height": p.height,
            "file_size_bytes": p.file_size_bytes,
            "faces_detected": p.detected_faces[0].get("count", 0) if p.detected_faces else 0,
            "tagged_users": tagged_users,
            "url": generate_presigned_url(p.s3_key),
            "thumbnail_url": generate_presigned_url(p.s3_key_thumbnail) if p.s3_key_thumbnail else None,
            "created_at": p.created_at.isoformat(),
        })
    return {"count": len(result), "photos": result}
