from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class PhotoPublic(BaseModel):
    id: UUID
    event_id: UUID
    uploader_id: UUID
    original_filename: str | None = None
    content_type: str
    width: int | None = None
    height: int | None = None
    file_size_bytes: int | None = None
    resolution_tier: str
    taken_at: datetime | None = None
    created_at: datetime

    # URLs are presigned and generated at response time
    url: str | None = None
    thumbnail_url: str | None = None

    model_config = {"from_attributes": True}


class PhotoUploadResponse(BaseModel):
    photo: PhotoPublic
    upload_count: int           # user's total for this event
    has_access: bool            # whether threshold is now met
    threshold: int              # threshold for this event
    faces_detected: int         # number of faces DeepFace found
    tagged_users: list[str]     # usernames of auto-tagged users


class PhotoTagPublic(BaseModel):
    id: UUID
    photo_id: UUID
    user_id: UUID
    confidence: float | None = None
    tag_source: str
    confirmed: bool | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class GalleryPhoto(PhotoPublic):
    """Photo with tag info, returned inside a gallery view."""
    tags: list[PhotoTagPublic] = []
    uploader_username: str | None = None
