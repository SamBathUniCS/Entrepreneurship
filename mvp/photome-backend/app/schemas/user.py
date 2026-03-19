from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, field_validator


class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str
    full_name: str | None = None

    @field_validator("username")
    @classmethod
    def username_alphanumeric(cls, v: str) -> str:
        if not v.replace("_", "").replace("-", "").isalnum():
            raise ValueError("Username must be alphanumeric (underscores/hyphens allowed)")
        if len(v) < 3 or len(v) > 64:
            raise ValueError("Username must be 3-64 characters")
        return v.lower()

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class UserUpdate(BaseModel):
    full_name: str | None = None
    bio: str | None = None
    face_recognition_enabled: bool | None = None
    recognition_scope: str | None = None
    allow_auto_tagging: bool | None = None


class UserPublic(BaseModel):
    id: UUID
    username: str
    full_name: str | None = None
    profile_picture_url: str | None = None
    bio: str | None = None
    tier: str
    upload_streak: int
    total_uploads: int
    created_at: datetime
    # Face recognition fields — computed from the face_embedding relationship
    has_face_embedding: bool = False
    selfie_url: str | None = None

    model_config = {"from_attributes": True}

    @classmethod
    def from_user(cls, user: "User") -> "UserPublic":
        has_emb = user.face_embedding is not None and user.face_embedding.embedding is not None
        selfie = (
            f"/api/v1/users/me/selfie/file"
            if has_emb
            else None
        )
        return cls(
            id=user.id,
            username=user.username,
            full_name=user.full_name,
            profile_picture_url=user.profile_picture_url,
            bio=user.bio,
            tier=user.tier,
            upload_streak=user.upload_streak,
            total_uploads=user.total_uploads,
            created_at=user.created_at,
            has_face_embedding=has_emb,
            selfie_url=selfie,
        )


class UserMe(UserPublic):
    email: str
    face_recognition_enabled: bool
    recognition_scope: str
    allow_auto_tagging: bool
    is_verified: bool


class PasswordChange(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v
