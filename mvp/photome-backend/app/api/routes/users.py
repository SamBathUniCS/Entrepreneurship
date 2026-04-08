import io
import logging
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.event import Event
from app.models.friendship import FaceEmbedding
from app.models.photo import Photo
from app.models.user import User
from app.schemas.user import UserPublic, UserUpdate
from app.services import deepface as df, storage

router = APIRouter(prefix="/users", tags=["users"])
logger = logging.getLogger(__name__)


def _photo_url(photo_id: str, thumb: bool = False) -> str:
    suffix = "?thumb=1" if thumb else ""
    return f"/api/v1/photos/{photo_id}/file{suffix}"


@router.get("/me", response_model=UserPublic)
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.refresh(current_user)
    return UserPublic.from_user(current_user)


# getting the current users upload hisotry, this will update the uploaded pictures section in the account page
@router.get("/me/uploads", response_model=list[dict])
def get_my_uploads(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    photos = (
        db.query(Photo)
        .filter(
            Photo.uploader_id == current_user.id,
            Photo.is_deleted == False,
        )
        .order_by(Photo.created_at.desc())
        .all()
    )



# unique set to avoid duplicates like getting same event several times
    unique_event_ids = set()
    for photo in photos:
        if photo.event_id:
            unique_event_ids.add(photo.event_id)

    event_id_list = list(unique_event_ids)
    events = []

    # querying the database for the events
    if event_id_list:
        events = db.query(Event).filter(Event.id.in_(event_id_list)).all()

# mapping the event ids to their tiles
    event_title_map = {}

    for event in events:
        event_id_str =  str(event.id)
        event_title_map[event_id_str] = event.title

    return [
        {
            "id": str(photo.id),
            "event_id": str(photo.event_id),
            "event_title": event_title_map.get(str(photo.event_id), "Unknown Event"),
            "uploader_id": str(photo.uploader_id),
            "original_filename": photo.original_filename,
            "created_at": photo.created_at.isoformat(),
            "url": _photo_url(str(photo.id)),
            "thumbnail_url": _photo_url(str(photo.id), thumb=True) if photo.s3_key_thumbnail else None,
        }
        for photo in photos
    ]


@router.get("/me/selfie/file")
def get_selfie_file(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Stream the current user's registered selfie image directly (no presigned URL needed)."""
    emb = db.query(FaceEmbedding).filter(FaceEmbedding.user_id == current_user.id).first()
    if not emb or not emb.selfie_s3_key:
        raise HTTPException(status_code=404, detail="No selfie registered")
    try:
        file_bytes = storage.download_file(emb.selfie_s3_key)
    except Exception:
        raise HTTPException(status_code=404, detail="Selfie file not found in storage")
    return StreamingResponse(
        io.BytesIO(file_bytes),
        media_type="image/jpeg",
        headers={"Cache-Control": "private, max-age=3600"},
    )


@router.patch("/me", response_model=UserPublic)
def update_me(
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    return UserPublic.from_user(current_user)


@router.post("/me/selfie", status_code=200)
async def upload_selfie(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    image_bytes = await file.read()
    if len(image_bytes) > 15 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image must be under 15 MB")

    # Always save the selfie to MinIO first
    selfie_key = storage.build_selfie_key(str(current_user.id))
    storage.upload_file(io.BytesIO(image_bytes), selfie_key, file.content_type or "image/jpeg")
    logger.info(f"Selfie uploaded to MinIO: {selfie_key} ({len(image_bytes)//1024}KB)")

    # Try to extract face embedding from DeepFace
    embedding = None
    face_detected = False
    error_detail = None

    try:
        embedding = await df.extract_embedding(image_bytes)
        face_detected = embedding is not None
        logger.info(f"DeepFace result: face_detected={face_detected}, embedding_dims={len(embedding) if embedding else 0}")
    except Exception as e:
        error_detail = str(e)
        logger.error(f"DeepFace call failed entirely: {e}")

    if embedding is not None:
        existing = db.query(FaceEmbedding).filter(FaceEmbedding.user_id == current_user.id).first()
        if existing:
            existing.embedding = embedding
            existing.selfie_s3_key = selfie_key
            logger.info("Updated existing face embedding")
        else:
            db.add(FaceEmbedding(
                user_id=current_user.id,
                embedding=embedding,
                selfie_s3_key=selfie_key,
                model_name=df.settings.DEEPFACE_MODEL,
            ))
            logger.info("Created new face embedding")
        db.commit()

    if face_detected:
        return {
            "message": "Face registered successfully — you will be matched in uploaded photos.",
            "face_detected": True,
            "selfie_saved": True,
        }
    else:
        return {
            "message": "Selfie saved, but no face was detected. Try a clearer, well-lit front-facing photo.",
            "face_detected": False,
            "selfie_saved": True,
            "debug": error_detail,
        }


@router.get("/me/selfie")
def get_selfie_info(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    emb = db.query(FaceEmbedding).filter(FaceEmbedding.user_id == current_user.id).first()
    if not emb:
        raise HTTPException(status_code=404, detail="No selfie registered")
    return {
        "has_embedding": emb.embedding is not None,
        "model": emb.model_name,
        "selfie_url": "/api/v1/users/me/selfie/file",
    }


@router.get("/{user_id}", response_model=UserPublic)
def get_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserPublic.from_user(user)
