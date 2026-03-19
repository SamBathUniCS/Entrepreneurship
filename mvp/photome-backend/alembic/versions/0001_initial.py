"""initial schema

Revision ID: 0001_initial
Revises: 
Create Date: 2025-02-15 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Enums ─────────────────────────────────────────────────────────────────
    op.execute("CREATE TYPE user_tier AS ENUM ('basic', 'pro', 'business')")
    op.execute("CREATE TYPE recognition_scope AS ENUM ('all_events', 'friends_only', 'none')")
    op.execute("CREATE TYPE event_status AS ENUM ('active', 'ended', 'archived')")
    op.execute("CREATE TYPE event_visibility AS ENUM ('private', 'public')")
    op.execute("CREATE TYPE resolution_tier AS ENUM ('low', 'high')")
    op.execute("CREATE TYPE tag_source AS ENUM ('auto', 'manual')")
    op.execute("CREATE TYPE friendship_status AS ENUM ('pending', 'accepted', 'declined', 'blocked')")

    # ── users ─────────────────────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("username", sa.String(64), nullable=False, unique=True),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(128), nullable=True),
        sa.Column("profile_picture_url", sa.Text, nullable=True),
        sa.Column("bio", sa.Text, nullable=True),
        sa.Column("tier", postgresql.ENUM("basic", "pro", "business", name="user_tier", create_type=False), nullable=False, server_default="basic"),
        sa.Column("face_recognition_enabled", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("recognition_scope", postgresql.ENUM("all_events", "friends_only", "none", name="recognition_scope", create_type=False), nullable=False, server_default="all_events"),
        sa.Column("allow_auto_tagging", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("upload_streak", sa.Integer, nullable=False, server_default="0"),
        sa.Column("total_uploads", sa.Integer, nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("is_verified", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"])
    op.create_index("ix_users_username", "users", ["username"])

    # ── events ────────────────────────────────────────────────────────────────
    op.create_table(
        "events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("cover_image_url", sa.Text, nullable=True),
        sa.Column("qr_code_url", sa.Text, nullable=True),
        sa.Column("creator_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("status", postgresql.ENUM("active", "ended", "archived", name="event_status", create_type=False), nullable=False, server_default="active"),
        sa.Column("visibility", postgresql.ENUM("private", "public", name="event_visibility", create_type=False), nullable=False, server_default="private"),
        sa.Column("max_attendees", sa.Integer, nullable=False, server_default="50"),
        sa.Column("event_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("exclusivity_ends_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("upload_threshold", sa.Integer, nullable=False, server_default="5"),
        sa.Column("photo_expiry_days", sa.Integer, nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    # ── event_members ─────────────────────────────────────────────────────────
    op.create_table(
        "event_members",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("event_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("events.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("upload_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("has_access", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("is_photographer", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("joined_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_event_members_event_user", "event_members", ["event_id", "user_id"], unique=True)

    # ── photos ────────────────────────────────────────────────────────────────
    op.create_table(
        "photos",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("event_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("events.id", ondelete="CASCADE"), nullable=False),
        sa.Column("uploader_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("s3_key", sa.String(512), nullable=False, unique=True),
        sa.Column("s3_key_thumbnail", sa.String(512), nullable=True),
        sa.Column("original_filename", sa.String(255), nullable=True),
        sa.Column("content_type", sa.String(64), nullable=False, server_default="image/jpeg"),
        sa.Column("width", sa.Integer, nullable=True),
        sa.Column("height", sa.Integer, nullable=True),
        sa.Column("file_size_bytes", sa.Integer, nullable=True),
        sa.Column("resolution_tier", postgresql.ENUM("low", "high", name="resolution_tier", create_type=False), nullable=False, server_default="high"),
        sa.Column("detected_faces", postgresql.JSONB, nullable=True),
        sa.Column("enhanced_url", sa.Text, nullable=True),
        sa.Column("is_deleted", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("taken_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    # ── photo_tags ────────────────────────────────────────────────────────────
    op.create_table(
        "photo_tags",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("photo_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("photos.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("confidence", sa.Float, nullable=True),
        sa.Column("tag_source", postgresql.ENUM("auto", "manual", name="tag_source", create_type=False), nullable=False, server_default="auto"),
        sa.Column("confirmed", sa.Boolean, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    # ── face_embeddings ───────────────────────────────────────────────────────
    op.create_table(
        "face_embeddings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("embedding", postgresql.JSONB, nullable=False),
        sa.Column("selfie_s3_key", sa.Text, nullable=True),
        sa.Column("model_name", sa.Text, nullable=False, server_default="Facenet512"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    # ── friendships ───────────────────────────────────────────────────────────
    op.create_table(
        "friendships",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("requester_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("addressee_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", postgresql.ENUM("pending", "accepted", "declined", "blocked", name="friendship_status", create_type=False), nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("friendships")
    op.drop_table("face_embeddings")
    op.drop_table("photo_tags")
    op.drop_table("photos")
    op.drop_table("event_members")
    op.drop_table("events")
    op.drop_table("users")

    op.execute("DROP TYPE IF EXISTS friendship_status")
    op.execute("DROP TYPE IF EXISTS tag_source")
    op.execute("DROP TYPE IF EXISTS resolution_tier")
    op.execute("DROP TYPE IF EXISTS event_visibility")
    op.execute("DROP TYPE IF EXISTS event_status")
    op.execute("DROP TYPE IF EXISTS recognition_scope")
    op.execute("DROP TYPE IF EXISTS user_tier")
