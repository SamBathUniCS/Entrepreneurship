"""
seed.py — populate the DB with a demo user, events, and photos from picsum.photos.

Run inside the backend container:
    docker compose exec backend python seed.py

Run again safely: it skips anything that already exists.
"""

import io
import os
import sys
import uuid
from datetime import datetime, timedelta, timezone

import boto3
import httpx
from botocore.config import Config
from passlib.context import CryptContext
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# ── Config from env (same vars as the app) ───────────────────────────────────
DATABASE_URL  = os.environ["DATABASE_URL"]
S3_ENDPOINT   = os.environ.get("S3_ENDPOINT_URL", "http://minio:9000")
S3_ACCESS_KEY = os.environ.get("S3_ACCESS_KEY", "minioadmin")
S3_SECRET_KEY = os.environ.get("S3_SECRET_KEY", "minioadmin")
S3_BUCKET     = os.environ.get("S3_BUCKET", "photome")
S3_REGION     = os.environ.get("S3_REGION", "us-east-1")

# ── DB setup ─────────────────────────────────────────────────────────────────
engine  = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)
db      = Session()

# ── Models (import after engine is ready) ────────────────────────────────────
from app.models.event import Event
from app.models.event_member import EventMember
from app.models.photo import Photo
from app.models.user import User

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ── MinIO client ─────────────────────────────────────────────────────────────
s3 = boto3.client(
    "s3",
    endpoint_url=S3_ENDPOINT,
    aws_access_key_id=S3_ACCESS_KEY,
    aws_secret_access_key=S3_SECRET_KEY,
    region_name=S3_REGION,
    config=Config(signature_version="s3v4"),
)

def ensure_bucket():
    try:
        s3.head_bucket(Bucket=S3_BUCKET)
    except Exception:
        s3.create_bucket(Bucket=S3_BUCKET)

def upload_image(key: str, data: bytes) -> str:
    s3.upload_fileobj(io.BytesIO(data), S3_BUCKET, key, ExtraArgs={"ContentType": "image/jpeg"})
    return key


# ── Helpers ──────────────────────────────────────────────────────────────────
def fetch_image(seed: int, width: int = 800, height: int = 600) -> bytes:
    """Download a deterministic photo from picsum.photos."""
    url = f"https://picsum.photos/seed/{seed}/{width}/{height}"
    r = httpx.get(url, follow_redirects=True, timeout=20)
    r.raise_for_status()
    return r.content


# ── Seed data ────────────────────────────────────────────────────────────────
DEMO_USER = {
    "email":    "demo@photome.app",
    "username": "demo",
    "password": "demo1234",
    "full_name": "Demo Account",
    "tier":     "pro",
}

EVENTS = [
    {
        "title":       "Jake's 21st Birthday 🎉",
        "description": "A night to remember at Shoreditch House.",
        "days_ago":    3,
        "photo_seeds": [10, 20, 30, 40, 50, 60],
    },
    {
        "title":       "Freshers Week 2024",
        "description": "First week at uni — chaos guaranteed.",
        "days_ago":    14,
        "photo_seeds": [70, 80, 90, 100, 110],
    },
    {
        "title":       "Summer BBQ at the Park",
        "description": "Good vibes, burgers, and terrible frisbee.",
        "days_ago":    30,
        "photo_seeds": [120, 130, 140, 150],
    },
    {
        "title":       "Ski Trip — Val Thorens",
        "description": "Blue runs and après-ski until 3 am.",
        "days_ago":    60,
        "photo_seeds": [160, 170, 180, 190, 200, 210, 220],
    },
    {
        "title":       "Graduation Ceremony 2025",
        "description": "We actually made it. Caps, gowns, and happy tears.",
        "days_ago":    7,
        "photo_seeds": [230, 240, 250, 260, 270],
    },
]


def run():
    ensure_bucket()

    # ── 1. Demo user ─────────────────────────────────────────────────────────
    user = db.query(User).filter(User.email == DEMO_USER["email"]).first()
    if user:
        print(f"[skip] user '{DEMO_USER['email']}' already exists")
    else:
        user = User(
            email=DEMO_USER["email"],
            username=DEMO_USER["username"],
            hashed_password=pwd_ctx.hash(DEMO_USER["password"]),
            full_name=DEMO_USER["full_name"],
            tier=DEMO_USER["tier"],
            is_active=True,
            is_verified=True,
        )
        db.add(user)
        db.flush()
        print(f"[ok]   created user '{user.email}'")

    # ── 2. Events + photos ───────────────────────────────────────────────────
    for ev_data in EVENTS:
        existing = db.query(Event).filter(Event.title == ev_data["title"]).first()
        if existing:
            print(f"[skip] event '{ev_data['title']}' already exists")
            continue

        event_date = datetime.now(timezone.utc) - timedelta(days=ev_data["days_ago"])

        event = Event(
            title=ev_data["title"],
            description=ev_data["description"],
            creator_id=user.id,
            status="active",
            visibility="public",
            event_date=event_date,
            exclusivity_ends_at=event_date + timedelta(hours=48),
            upload_threshold=3,
            photo_expiry_days=0,
            max_attendees=50,
        )
        db.add(event)
        db.flush()

        # Creator auto-joins with access
        db.add(EventMember(event_id=event.id, user_id=user.id, has_access=True))

        # Photos
        print(f"[..] seeding '{ev_data['title']}' — downloading {len(ev_data['photo_seeds'])} photos")
        for i, seed in enumerate(ev_data["photo_seeds"]):
            try:
                img_bytes = fetch_image(seed)
            except Exception as e:
                print(f"     [warn] could not fetch picsum seed {seed}: {e}")
                continue

            photo_id = uuid.uuid4()
            s3_key = f"events/{event.id}/photos/{photo_id}.jpg"
            upload_image(s3_key, img_bytes)

            photo = Photo(
                id=photo_id,
                event_id=event.id,
                uploader_id=user.id,
                s3_key=s3_key,
                original_filename=f"photo_{i+1}.jpg",
                content_type="image/jpeg",
                width=800,
                height=600,
                file_size_bytes=len(img_bytes),
                resolution_tier="high",
            )
            db.add(photo)

        db.flush()
        print(f"[ok]   event '{event.title}' seeded")

    db.commit()
    print("\n✓ Seed complete.")
    print(f"  Login: {DEMO_USER['email']} / {DEMO_USER['password']}")


if __name__ == "__main__":
    try:
        run()
    except Exception as e:
        db.rollback()
        print(f"\n[error] {e}", file=sys.stderr)
        raise
    finally:
        db.close()
