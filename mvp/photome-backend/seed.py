"""
Seed script — creates demo users, events, and photos.

Run inside the backend container:
  podman cp photome-backend/seed.py photome-backend:/app/seed.py
  podman compose exec backend python seed.py
"""
import io
import uuid
import urllib.request
from datetime import datetime, timezone, timedelta

from app.db.session import SessionLocal
from app.models.user import User
from app.models.event import Event
from app.models.event_member import EventMember
from app.models.photo import Photo
from app.core.security import get_password_hash
from app.services import storage

db = SessionLocal()

# ── Helpers ───────────────────────────────────────────────────────────────────

def _user_exists(email):
    return db.query(User).filter(User.email == email).first()

def _fetch_image(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=10) as r:
        return r.read()

def _seed_photo(event: Event, uploader: Event, img_url: str, filename: str):
    photo_id = uuid.uuid4()
    s3_key = storage.build_s3_key(str(event.id), str(photo_id))
    try:
        data = _fetch_image(img_url)
    except Exception as e:
        print(f"  ⚠  Could not fetch {img_url}: {e} — skipping")
        return None
    storage.upload_file(io.BytesIO(data), s3_key, "image/jpeg")
    photo = Photo(
        id=photo_id,
        event_id=event.id,
        uploader_id=uploader.id,
        s3_key=s3_key,
        original_filename=filename,
        content_type="image/jpeg",
        resolution_tier="high",
    )
    db.add(photo)
    return photo

# ── Demo users ────────────────────────────────────────────────────────────────

print("👤  Seeding users…")

demo = _user_exists("demo@photome.app")
if not demo:
    demo = User(
        email="demo@photome.app",
        username="demo",
        hashed_password=get_password_hash("demo1234"),
        full_name="Demo User",
        tier="pro",
        is_active=True,
        is_verified=True,
    )
    db.add(demo)
    print("   created demo@photome.app / demo1234")
else:
    print("   demo@photome.app already exists — skipping")

alice = _user_exists("alice@photome.app")
if not alice:
    alice = User(
        email="alice@photome.app",
        username="alice",
        hashed_password=get_password_hash("alice1234"),
        full_name="Alice Smith",
        tier="basic",
        is_active=True,
        is_verified=True,
    )
    db.add(alice)
    print("   created alice@photome.app / alice1234")
else:
    print("   alice@photome.app already exists — skipping")

bob = _user_exists("bob@photome.app")
if not bob:
    bob = User(
        email="bob@photome.app",
        username="bob",
        hashed_password=get_password_hash("bob12345"),
        full_name="Bob Jones",
        tier="basic",
        is_active=True,
        is_verified=True,
    )
    db.add(bob)
    print("   created bob@photome.app / bob12345")
else:
    print("   bob@photome.app already exists — skipping")

db.flush()  # get IDs without committing

# ── Demo events ───────────────────────────────────────────────────────────────

print("\n📅  Seeding events…")

EVENTS = [
    {
        "title": "Summer Rooftop Party",
        "description": "Rooftop vibes, golden hour, and good music.",
        "days_ago": 2,
        "photos": [
            ("https://picsum.photos/seed/party1/800/600", "party1.jpg"),
            ("https://picsum.photos/seed/party2/800/600", "party2.jpg"),
            ("https://picsum.photos/seed/party3/800/600", "party3.jpg"),
            ("https://picsum.photos/seed/party4/800/600", "party4.jpg"),
            ("https://picsum.photos/seed/party5/800/600", "party5.jpg"),
            ("https://picsum.photos/seed/party6/800/600", "party6.jpg"),
        ],
    },
    {
        "title": "Bath University Freshers",
        "description": "First week — new faces, new memories.",
        "days_ago": 10,
        "photos": [
            ("https://picsum.photos/seed/fresh1/800/600", "fresh1.jpg"),
            ("https://picsum.photos/seed/fresh2/800/600", "fresh2.jpg"),
            ("https://picsum.photos/seed/fresh3/800/600", "fresh3.jpg"),
            ("https://picsum.photos/seed/fresh4/800/600", "fresh4.jpg"),
        ],
    },
    {
        "title": "Football Social",
        "description": "Post-match beers and banter.",
        "days_ago": 5,
        "photos": [
            ("https://picsum.photos/seed/sport1/800/600", "sport1.jpg"),
            ("https://picsum.photos/seed/sport2/800/600", "sport2.jpg"),
            ("https://picsum.photos/seed/sport3/800/600", "sport3.jpg"),
        ],
    },
]

for ev_data in EVENTS:
    existing = db.query(Event).filter(Event.title == ev_data["title"]).first()
    if existing:
        print(f"   '{ev_data['title']}' already exists — skipping")
        continue

    event_date = datetime.now(timezone.utc) - timedelta(days=ev_data["days_ago"])
    event = Event(
        title=ev_data["title"],
        description=ev_data["description"],
        creator_id=demo.id,
        status="active",
        visibility="public",
        event_date=event_date,
        upload_threshold=3,
    )
    db.add(event)
    db.flush()

    # Add all three users as members with access already unlocked
    for u in [demo, alice, bob]:
        db.add(EventMember(
            event_id=event.id,
            user_id=u.id,
            upload_count=5,
            has_access=True,
        ))

    db.flush()

    print(f"   '{event.title}' — uploading {len(ev_data['photos'])} photos…")
    for url, fname in ev_data["photos"]:
        p = _seed_photo(event, demo, url, fname)
        if p:
            print(f"      ✓ {fname}")

db.commit()
print("\n✅  Seed complete!")
print("\nDemo credentials:")
print("  demo@photome.app  /  demo1234  (Pro)")
print("  alice@photome.app /  alice1234 (Basic)")
print("  bob@photome.app   /  bob12345  (Basic)")
