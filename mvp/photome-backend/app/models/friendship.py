import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Enum, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.db.session import Base


class FaceEmbedding(Base):
    """Stores a user's face embedding vector for DeepFace matching."""

    __tablename__ = "face_embeddings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)

    # The embedding vector from DeepFace (Facenet512 = 512 floats)
    embedding = Column(JSONB, nullable=False)

    # The selfie used to generate the embedding (stored in S3)
    selfie_s3_key = Column(Text, nullable=True)

    model_name = Column(Text, default="Facenet512", nullable=False)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    user = relationship("User", back_populates="face_embedding")


class Friendship(Base):
    """Tracks friend relationships between users."""

    __tablename__ = "friendships"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    requester_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    addressee_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # pending | accepted | declined | blocked
    status = Column(
        Enum("pending", "accepted", "declined", "blocked", name="friendship_status"),
        default="pending",
        nullable=False,
    )

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    requester = relationship("User", foreign_keys=[requester_id], back_populates="friendships_sent")
    addressee = relationship("User", foreign_keys=[addressee_id], back_populates="friendships_received")
