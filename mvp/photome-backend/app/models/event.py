import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.session import Base


class Event(Base):
    __tablename__ = "events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    cover_image_url = Column(Text, nullable=True)
    qr_code_url = Column(Text, nullable=True)

    creator_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    # Status: active | ended | archived
    status = Column(
        Enum("active", "ended", "archived", name="event_status"),
        default="active",
        nullable=False,
    )

    # Visibility after exclusivity window
    # private | public
    visibility = Column(
        Enum("private", "public", name="event_visibility"),
        default="private",
        nullable=False,
    )

    # Max attendees (50 for Pro, 500 for Business)
    max_attendees = Column(Integer, default=50, nullable=False)

    # 48-hour exclusivity window from event end
    event_date = Column(DateTime(timezone=True), nullable=True)
    exclusivity_ends_at = Column(DateTime(timezone=True), nullable=True)

    # Upload threshold to unlock photos (mirrors app-level default, can be overridden)
    upload_threshold = Column(Integer, default=5, nullable=False)

    # Auto-delete photos after X days (0 = never)
    photo_expiry_days = Column(Integer, default=0, nullable=False)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    creator = relationship("User", back_populates="events_created", foreign_keys=[creator_id])
    members = relationship("EventMember", back_populates="event")
    photos = relationship("Photo", back_populates="event")
