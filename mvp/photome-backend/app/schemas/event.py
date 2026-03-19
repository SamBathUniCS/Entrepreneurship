from datetime import datetime
from uuid import UUID
from typing import Optional

from pydantic import BaseModel, field_validator


class EventCreate(BaseModel):
    title: str
    description: str | None = None
    event_date: datetime | None = None
    visibility: str = "private"
    upload_threshold: int = 5
    photo_expiry_days: int = 0

    @field_validator("title")
    @classmethod
    def title_length(cls, v: str) -> str:
        if len(v.strip()) < 2:
            raise ValueError("Title must be at least 2 characters")
        return v.strip()

    @field_validator("visibility")
    @classmethod
    def valid_visibility(cls, v: str) -> str:
        if v not in ("private", "public"):
            raise ValueError("visibility must be 'private' or 'public'")
        return v


class EventUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    event_date: datetime | None = None
    visibility: str | None = None
    status: str | None = None
    upload_threshold: int | None = None
    photo_expiry_days: int | None = None


class EventPublic(BaseModel):
    id: UUID
    title: str
    description: str | None = None
    cover_image_url: str | None = None
    qr_code_url: str | None = None
    creator_id: UUID
    status: str
    visibility: str
    max_attendees: int
    event_date: datetime | None = None
    exclusivity_ends_at: datetime | None = None
    upload_threshold: int
    photo_expiry_days: int
    created_at: datetime
    updated_at: datetime

    # Computed at query time
    member_count: int = 0
    photo_count: int = 0

    model_config = {"from_attributes": True}


class EventJoinResponse(BaseModel):
    message: str
    already_member: bool

    event: Optional[dict] = None
    membership_id: Optional[str] = None
    has_access: Optional[bool] = None
    upload_count: Optional[int] = None
    photos_featuring_you: Optional[int] = None
