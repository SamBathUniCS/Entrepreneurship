from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.core.security import get_password_hash, verify_password
from app.models.friendship import FaceEmbedding, Friendship
from app.models.user import User
from app.schemas.user import UserMe, UserPublic, UserUpdate, PasswordChange
from app.services import deepface as df, storage

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserMe)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserMe)
def update_me(
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update the current user's profile / privacy settings."""
    update_data = payload.model_dump(exclude_none=True)
    if "recognition_scope" in update_data:
        if update_data["recognition_scope"] not in ("all_events", "friends_only", "none"):
            raise HTTPException(status_code=400, detail="Invalid recognition_scope")
    for field, value in update_data.items():
        setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/me/change-password", status_code=204)
def change_password(
    payload: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    current_user.hashed_password = get_password_hash(payload.new_password)
    db.commit()


@router.post("/me/selfie", status_code=200)
async def upload_selfie(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Upload a selfie to register the user's face embedding for recognition.
    The image is sent to DeepFace, the embedding is stored, and the selfie is saved to MinIO.
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    image_bytes = await file.read()
    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image must be under 10 MB")

    import io, logging
    logger = logging.getLogger(__name__)

    # Always save the selfie image first regardless of face detection result
    selfie_key = storage.build_selfie_key(str(current_user.id))
    storage.upload_file(io.BytesIO(image_bytes), selfie_key, file.content_type or "image/jpeg")
    logger.info(f"Selfie saved to MinIO: {selfie_key}")

    # Extract embedding — try all detectors, never hard-fail
    embedding = await df.extract_embedding(image_bytes)
    logger.info(f"Embedding result: {'found ({len(embedding)} dims)' if embedding else 'NOT FOUND — selfie saved but no embedding stored'}")

    face_detected = embedding is not None

    if face_detected:
        existing = db.query(FaceEmbedding).filter(FaceEmbedding.user_id == current_user.id).first()
        if existing:
            existing.embedding = embedding
            existing.selfie_s3_key = selfie_key
        else:
            db.add(FaceEmbedding(
                user_id=current_user.id,
                embedding=embedding,
                selfie_s3_key=selfie_key,
                model_name="Facenet512",
            ))
        db.commit()

    return {
        "message": "Face registered successfully" if face_detected else "Selfie saved but no face detected — face matching will be disabled. Try a clearer photo.",
        "face_detected": face_detected,
        "selfie_saved": True,
    }


@router.get("/{username}", response_model=UserPublic)
def get_user(username: str, db: Session = Depends(get_db)):
    """Get a public user profile by username."""
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


# ── Friends ────────────────────────────────────────────────────────────────────

@router.get("/me/friends", response_model=list[UserPublic])
def list_friends(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List accepted friends."""
    friendships = (
        db.query(Friendship)
        .filter(
            Friendship.status == "accepted",
            (Friendship.requester_id == current_user.id) | (Friendship.addressee_id == current_user.id),
        )
        .all()
    )
    friend_ids = [
        f.addressee_id if f.requester_id == current_user.id else f.requester_id
        for f in friendships
    ]
    return db.query(User).filter(User.id.in_(friend_ids)).all()


@router.post("/me/friends/{username}", status_code=201)
def send_friend_request(
    username: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Send a friend request to another user."""
    target = db.query(User).filter(User.username == username).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot friend yourself")

    existing = (
        db.query(Friendship)
        .filter(
            ((Friendship.requester_id == current_user.id) & (Friendship.addressee_id == target.id))
            | ((Friendship.requester_id == target.id) & (Friendship.addressee_id == current_user.id))
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail=f"Friendship already exists with status: {existing.status}")

    friendship = Friendship(requester_id=current_user.id, addressee_id=target.id)
    db.add(friendship)
    db.commit()
    return {"message": "Friend request sent", "friendship_id": str(friendship.id)}


@router.patch("/me/friends/{friendship_id}/accept", status_code=200)
def accept_friend_request(
    friendship_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    friendship = db.query(Friendship).filter(Friendship.id == friendship_id).first()
    if not friendship or friendship.addressee_id != current_user.id:
        raise HTTPException(status_code=404, detail="Friend request not found")
    if friendship.status != "pending":
        raise HTTPException(status_code=400, detail="Request is not pending")
    friendship.status = "accepted"
    db.commit()
    return {"message": "Friend request accepted"}
