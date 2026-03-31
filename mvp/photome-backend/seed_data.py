"""
Seed script for PhotoMe - creates realistic test data.

Usage:
    python seed_data.py

Creates:
- 10 users (Sushil, Gabriel, Nico, Boff, Kit, Saniya, Alex, Maya, Jordan, Taylor)
- 5 events (Summer BBQ, Hiking Trip, Birthday Party, Beach Day, Concert Night)
- Friend connections between users
- Sample photos from URLs (unsplash placeholders)
- Event memberships
"""
import asyncio
import io
import sys
from datetime import datetime, timedelta
from pathlib import Path

import httpx
from PIL import Image
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add app to path
sys.path.insert(0, str(Path(__file__).parent))

from app.core.security import get_password_hash
from app.core.config import get_settings
from app.models.event import Event
from app.models.event_member import EventMember
from app.models.friendship import Friendship
from app.models.photo import Photo
from app.models.user import User
from app.services import storage

settings = get_settings()

# Create DB session
engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)


USERS = [
    {"username": "sushil", "email": "sushil@photome.app", "tier": "business"},
    {"username": "gabriel", "email": "gabriel@photome.app", "tier": "pro"},
    {"username": "nico", "email": "nico@photome.app", "tier": "pro"},
    {"username": "boff", "email": "boff@photome.app", "tier": "pro"},
    {"username": "kit", "email": "kit@photome.app", "tier": "basic"},
    {"username": "saniya", "email": "saniya@photome.app", "tier": "pro"},
    {"username": "alex", "email": "alex@photome.app", "tier": "basic"},
    {"username": "maya", "email": "maya@photome.app", "tier": "pro"},
    {"username": "jordan", "email": "jordan@photome.app", "tier": "basic"},
    {"username": "taylor", "email": "taylor@photome.app", "tier": "pro"},
]

EVENTS = [
    {
        "title": "Summer BBQ 2026",
        "description": "Annual summer cookout with friends and family",
        "visibility": "public",
        "event_date": datetime.now() - timedelta(days=7),
        "creator": "sushil",
        "members": ["sushil", "gabriel", "nico", "boff", "kit", "saniya", "maya"],
        "photographers": ["maya"],
    },
    {
        "title": "Mountain Hiking Trip",
        "description": "Weekend adventure in the mountains",
        "visibility": "public",
        "event_date": datetime.now() - timedelta(days=14),
        "creator": "gabriel",
        "members": ["gabriel", "nico", "kit", "maya", "jordan"],
        "photographers": ["maya"],
    },
    {
        "title": "Maya's 25th Birthday Bash",
        "description": "Surprise party for Maya!",
        "visibility": "private",
        "event_date": datetime.now() - timedelta(days=3),
        "creator": "alex",
        "members": ["alex", "maya", "saniya", "taylor", "boff"],
        "photographers": ["maya"],
},
{
        "title": "Beach Day Vibes",
        "description": "Chill day at the beach with volleyball and music",
        "visibility": "public",
        "event_date": datetime.now() + timedelta(days=5),
        "creator": "nico",
        "members": ["nico", "sushil", "kit", "jordan", "taylor", "gabriel", "maya"],
        "photographers": ["maya"],
    },
    {
        "title": "Concert Night - The Waves",
        "description": "Live music event downtown",
        "visibility": "public",
        "event_date": datetime.now() + timedelta(days=12),
        "creator": "taylor",
        "members": ["taylor", "maya", "boff", "saniya", "alex"],
        "photographers": ["maya"],
    },
]

# Friend connections (bidirectional)
FRIENDSHIPS = [
    ("sushil", "gabriel"),
    ("sushil", "nico"),
    ("sushil", "kit"),
    ("gabriel", "nico"),
    ("gabriel", "maya"),
    ("nico", "boff"),
    ("boff", "kit"),
    ("kit", "saniya"),
    ("saniya", "maya"),
    ("maya", "alex"),
    ("alex", "taylor"),
    ("taylor", "jordan"),
    ("jordan", "kit"),
    ("maya", "taylor"),
    ("boff", "saniya"),
]

# Sample photos from Unsplash (portrait placeholders)
SAMPLE_PHOTOS = [
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400",  # portrait 1
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",  # portrait 2
    "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400",  # portrait 3
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400",  # portrait 4
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400",  # portrait 5
]


async def download_image(url: str) -> bytes:
    """Download image from URL."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        return resp.content


def create_users(db):
    """Create all users with password 'letmeinbro'."""
    print("Creating users...")
    password_hash = get_password_hash("letmeinbro")
    user_map = {}
    
    for user_data in USERS:
        user = User(
            username=user_data["username"],
            email=user_data["email"],
            hashed_password=password_hash,
            tier=user_data["tier"],
            face_recognition_enabled=True,
            recognition_scope="all_events",
        )
        db.add(user)
        db.flush()
        user_map[user_data["username"]] = user
        print(f"  ✓ Created {user.username} ({user.email}) - {user.tier}")
    
    db.commit()
    return user_map


def create_friendships(db, user_map):
    """Create friend connections."""
    print("\nCreating friendships...")
    for user1_name, user2_name in FRIENDSHIPS:
        user1 = user_map[user1_name]
        user2 = user_map[user2_name]
        
        friendship = Friendship(
            requester_id=user1.id,
            addressee_id=user2.id,
            status="accepted",
        )
        db.add(friendship)
        print(f"  ✓ {user1_name} ↔ {user2_name}")
    
    db.commit()


def create_events(db, user_map):
    """Create events and memberships."""
    print("\nCreating events...")
    event_map = {}
    
    for event_data in EVENTS:
        creator = user_map[event_data["creator"]]
        
        event = Event(
            title=event_data["title"],
            description=event_data["description"],
            creator_id=creator.id,
            visibility=event_data["visibility"],
            event_date=event_data["event_date"],
            status="active",
            upload_threshold=5,
            photo_expiry_days=0,
            max_attendees=50 if creator.tier == "pro" else 500,
        )
        db.add(event)
        db.flush()
        event_map[event_data["title"]] = event
        
        print(f"  ✓ Created '{event.title}' by {creator.username}")
        
        # Add members
        for member_name in event_data["members"]:
            member = user_map[member_name]
            membership = EventMember(
                event_id=event.id,
                user_id=member.id,
                has_access=True,  # Give everyone access for testing
                upload_count=0,
                is_photographer=True,
            )
            db.add(membership)
            print(f"    → {member_name} joined")
    
    db.commit()
    return event_map

async def upload_sample_photos(db, user_map, event_map):
    """Upload all sample photos to every event by Maya and create DB records."""
    from app.models.photo import Photo  # import your Photo model
    from datetime import datetime

    print("\nUploading sample photos as Maya...")

    uploader = user_map["maya"]

    for event_title, event in event_map.items():
        # Get Maya's membership
        membership = db.query(EventMember).filter(
            EventMember.event_id == event.id,
            EventMember.user_id == uploader.id,
        ).first()

        if not membership:
            print(f"  ✗ Maya is not a member of '{event_title}'")
            continue

        for idx, photo_url in enumerate(SAMPLE_PHOTOS):
            try:
                print(f"  Downloading {photo_url[:50]} for '{event_title}'...")
                image_bytes = await download_image(photo_url)

                # Save original to MinIO
                photo_id = f"{str(event.id)[:8]}_maya_{idx}"
                s3_key = storage.build_s3_key(str(event.id), photo_id)
                storage.upload_file(io.BytesIO(image_bytes), s3_key, "image/jpeg")

                # Create thumbnail
                img = Image.open(io.BytesIO(image_bytes))
                img.thumbnail((400, 400), Image.LANCZOS)
                thumb_buf = io.BytesIO()
                img.convert("RGB").save(thumb_buf, format="JPEG", quality=85)
                thumb_bytes = thumb_buf.getvalue()

                s3_key_thumb = storage.build_s3_key(str(event.id), photo_id, "_thumb")
                storage.upload_file(io.BytesIO(thumb_bytes), s3_key_thumb, "image/jpeg")

                # Create Photo row in DB
                photo = Photo(
                    event_id=event.id,
                    uploader_id=uploader.id,
                    s3_key=s3_key,
                    created_at=datetime.utcnow(),
                )
                db.add(photo)

                # Update upload count
                membership.upload_count += 1

                print(f"  ✓ Uploaded and DB record created for '{event_title}' by Maya")

            except Exception as e:
                print(f"  ✗ Failed to upload: {e}")

    db.commit()

async def main():
    import argparse, sys
    parser = argparse.ArgumentParser()
    parser.add_argument("--yes", "-y", action="store_true", help="Skip confirmation prompt")
    args, _ = parser.parse_known_args()

    print("=" * 60)
    print("PhotoMe Seed Script")
    print("=" * 60)
    print("\nThis will create:")
    print("  • 10 users (password: letmeinbro)")
    print("  • 5 events with memberships")
    print("  • 15 friend connections")
    print("  • 10 sample photos")
    print("\n⚠️  WARNING: This will add data to your database!")
    print("   Run 'docker compose down -v' first to start fresh.\n")

    if not args.yes:
        response = input("Continue? [y/N]: ")
        if response.lower() != 'y':
            print("Aborted.")
            return
    
    db = SessionLocal()
    
    try:
        # Ensure MinIO bucket exists
        storage.ensure_bucket_exists()
        print("\n✓ MinIO bucket ready\n")
        
        # Create data
        user_map = create_users(db)
        create_friendships(db, user_map)
        event_map = create_events(db, user_map)
        await upload_sample_photos(db, user_map, event_map)
        
        print("\n" + "=" * 60)
        print("✓ Seed complete!")
        print("=" * 60)
        print("\nLogin credentials (all users):")
        print("  Password: letmeinbro")
        print("\nUsers:")
        for user in USERS:
            print(f"  • {user['username']}@photome.app ({user['tier']})")
        
        print("\nEvents:")
        for event in EVENTS:
            print(f"  • {event['title']} ({event['visibility']})")
        
        print("\n🎉 Ready to test! Open photome-tester.html and login.")
        
    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    asyncio.run(main())
