import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.session import Base


class EventMember(Base):
    """Tracks who has joined an event and their upload contribution."""

    __tablename__ = "event_members"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # How many photos this user has uploaded to this event
    upload_count = Column(Integer, default=0, nullable=False)

    # Has the user unlocked access (met threshold or paid Pro)
    has_access = Column(Boolean, default=False, nullable=False)

    # Is this user listed as an official photographer for the event
    is_photographer = Column(Boolean, default=False, nullable=False)

    joined_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    event = relationship("Event", back_populates="members")
    user = relationship("User", back_populates="event_memberships")
