import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Enum, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.session import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(64), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(128), nullable=True)
    profile_picture_url = Column(Text, nullable=True)
    bio = Column(Text, nullable=True)

    # Tier: basic | pro | business
    tier = Column(Enum("basic", "pro", "business", name="user_tier"), default="basic", nullable=False)

    # Privacy controls
    face_recognition_enabled = Column(Boolean, default=True, nullable=False)
    # all_events | friends_only | none
    recognition_scope = Column(
        Enum("all_events", "friends_only", "none", name="recognition_scope"),
        default="all_events",
        nullable=False,
    )
    allow_auto_tagging = Column(Boolean, default=True, nullable=False)

    # Gamification
    upload_streak = Column(Integer, default=0, nullable=False)
    total_uploads = Column(Integer, default=0, nullable=False)

    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    events_created = relationship("Event", back_populates="creator", foreign_keys="Event.creator_id")
    event_memberships = relationship("EventMember", back_populates="user")
    photos = relationship("Photo", back_populates="uploader")
    face_embedding = relationship("FaceEmbedding", back_populates="user", uselist=False)
    friendships_sent = relationship("Friendship", foreign_keys="Friendship.requester_id", back_populates="requester")
    friendships_received = relationship("Friendship", foreign_keys="Friendship.addressee_id", back_populates="addressee")
