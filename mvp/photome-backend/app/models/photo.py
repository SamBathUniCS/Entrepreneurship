import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Integer, String, Text, Float
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.db.session import Base


class Photo(Base):
    __tablename__ = "photos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    uploader_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    # S3/MinIO storage
    s3_key = Column(String(512), nullable=False, unique=True)
    s3_key_thumbnail = Column(String(512), nullable=True)
    original_filename = Column(String(255), nullable=True)
    content_type = Column(String(64), default="image/jpeg", nullable=False)

    # Image metadata
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    file_size_bytes = Column(Integer, nullable=True)

    # Resolution tier: low | high
    resolution_tier = Column(
        Enum("low", "high", name="resolution_tier"),
        default="high",
        nullable=False,
    )

    # Face detection results stored as JSON list of face bounding boxes / user IDs
    # e.g. [{"user_id": "...", "confidence": 0.95, "bbox": [x, y, w, h]}]
    detected_faces = Column(JSONB, nullable=True)

    # AI-enhanced version available
    enhanced_url = Column(Text, nullable=True)

    # Soft delete / expiry
    is_deleted = Column(Boolean, default=False, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)

    taken_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    event = relationship("Event", back_populates="photos")
    uploader = relationship("User", back_populates="photos")
    tags = relationship("PhotoTag", back_populates="photo")


class PhotoTag(Base):
    """Records which users are tagged/detected in which photos."""

    __tablename__ = "photo_tags"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    photo_id = Column(UUID(as_uuid=True), ForeignKey("photos.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Confidence score from DeepFace
    confidence = Column(Float, nullable=True)

    # auto = face recognition, manual = user tagged themselves/someone else
    tag_source = Column(
        Enum("auto", "manual", name="tag_source"),
        default="auto",
        nullable=False,
    )

    # User confirmed / denied the tag
    confirmed = Column(Boolean, nullable=True)  # None = pending, True = confirmed, False = rejected

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    photo = relationship("Photo", back_populates="tags")
    user = relationship("User")
