"""
Photo upload pipeline:
1. Validate & read the file
2. Generate thumbnail
3. Upload originals + thumbnail to MinIO
4. Run DeepFace on the image to find faces
5. Match detected faces against all registered user embeddings
6. Create Photo + PhotoTag rows in the DB
7. Update EventMember upload_count and check access threshold
"""
import io
import uuid
from datetime import datetime, timezone

from PIL import Image
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.event import Event
from app.models.event_member import EventMember
from app.models.friendship import FaceEmbedding
from app.models.photo import Photo, PhotoTag
from app.models.user import User
from app.services import storage, deepface as df

settings = get_settings()

THUMBNAIL_SIZE = (400, 400)
MAX_IMAGE_BYTES = 20 * 1024 * 1024  # 20 MB


async def handle_photo_upload(
    db: Session,
    event: Event,
    uploader: User,
    file_bytes: bytes,
    filename: str,
    content_type: str,
) -> tuple[Photo, int, bool, list]:
    """
    Full upload pipeline.
    Returns (photo, new_upload_count, has_access, tagged_users).
    """
    photo_id = uuid.uuid4()

    # --- Generate thumbnail ---
    thumbnail_bytes = _make_thumbnail(file_bytes)

    # --- Get image dimensions ---
    width, height = _get_dimensions(file_bytes)

    # --- Build S3 keys ---
    s3_key = storage.build_s3_key(str(event.id), str(photo_id))
    s3_key_thumb = storage.build_s3_key(str(event.id), str(photo_id), "_thumb")

    # --- Upload to MinIO ---
    storage.upload_file(io.BytesIO(file_bytes), s3_key, content_type)
    if thumbnail_bytes:
        storage.upload_file(io.BytesIO(thumbnail_bytes), s3_key_thumb, "image/jpeg")

    # --- Create Photo record ---
    photo = Photo(
        id=photo_id,
        event_id=event.id,
        uploader_id=uploader.id,
        s3_key=s3_key,
        s3_key_thumbnail=s3_key_thumb if thumbnail_bytes else None,
        original_filename=filename,
        content_type=content_type,
        width=width,
        height=height,
        file_size_bytes=len(file_bytes),
        resolution_tier="high",
    )
    db.add(photo)
    db.flush()  # get photo.id before face processing

    # --- Run face recognition ---
    tagged_users: list[tuple[User, float]] = []
    face_results = await df.detect_faces(file_bytes)

    if face_results:
        # Load all registered embeddings for comparison
        all_embeddings = db.query(FaceEmbedding).all()

        for face in face_results:
            detected_emb = face.get("embedding")
            if not detected_emb:
                continue
            for emb_record in all_embeddings:
                matched, distance = df.is_match(detected_emb, emb_record.embedding)
                if matched:
                    tagged_user = db.query(User).filter(User.id == emb_record.user_id).first()
                    if tagged_user and tagged_user.face_recognition_enabled:
                        # Check recognition_scope
                        if _scope_allows(uploader, tagged_user, db):
                            tag = PhotoTag(
                                photo_id=photo.id,
                                user_id=tagged_user.id,
                                confidence=round(1.0 - distance, 4),
                                tag_source="auto",
                            )
                            db.add(tag)
                            tagged_users.append((tagged_user, round(1.0 - distance, 4)))

    # Store detected face count on photo
    photo.detected_faces = [{"count": len(face_results)}]

    # --- Update EventMember upload count ---
    membership = (
        db.query(EventMember)
        .filter(EventMember.event_id == event.id, EventMember.user_id == uploader.id)
        .first()
    )
    if not membership:
        # Auto-join if uploading without explicit join (e.g. photographer)
        membership = EventMember(event_id=event.id, user_id=uploader.id)
        db.add(membership)
        db.flush()

    membership.upload_count += 1

    # --- Check access threshold ---
    has_access = membership.has_access
    if not has_access:
        if uploader.tier in ("pro", "business"):
            has_access = True
        elif membership.upload_count >= event.upload_threshold:
            has_access = True
        membership.has_access = has_access

    # --- Update user total_uploads & streak ---
    uploader.total_uploads += 1

    db.commit()
    db.refresh(photo)
    db.refresh(membership)

    return photo, membership.upload_count, has_access, tagged_users


def _make_thumbnail(image_bytes: bytes) -> bytes | None:
    try:
        img = Image.open(io.BytesIO(image_bytes))
        img.thumbnail(THUMBNAIL_SIZE, Image.LANCZOS)
        buf = io.BytesIO()
        img.convert("RGB").save(buf, format="JPEG", quality=85)
        return buf.getvalue()
    except Exception:
        return None


def _get_dimensions(image_bytes: bytes) -> tuple[int | None, int | None]:
    try:
        img = Image.open(io.BytesIO(image_bytes))
        return img.size  # (width, height)
    except Exception:
        return None, None


def _scope_allows(uploader: User, target_user: User, db: Session) -> bool:
    """Check if target_user's recognition_scope permits tagging by uploader."""
    scope = target_user.recognition_scope
    if scope == "none":
        return False
    if scope == "all_events":
        return True
    if scope == "friends_only":
        from app.models.friendship import Friendship
        friendship = (
            db.query(Friendship)
            .filter(
                Friendship.status == "accepted",
                (
                    (Friendship.requester_id == uploader.id) & (Friendship.addressee_id == target_user.id)
                ) | (
                    (Friendship.requester_id == target_user.id) & (Friendship.addressee_id == uploader.id)
                ),
            )
            .first()
        )
        return friendship is not None
    return False
