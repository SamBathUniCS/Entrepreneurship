# PhotoMe Backend

Event-based photo sharing with face recognition, built with FastAPI + PostgreSQL + MinIO + DeepFace.

---

## Directory Structure

```
photome/
├── docker-compose.yaml          ← root compose file (all services)
└── photome-backend/
    ├── .env                     ← local env vars (for running outside Docker)
    ├── Dockerfile
    ├── requirements.txt
    ├── alembic.ini
    ├── alembic/
    │   ├── env.py
    │   ├── script.py.mako
    │   └── versions/
    │       └── 0001_initial.py  ← full schema migration
    ├── app/
    │   ├── main.py              ← FastAPI app entry point
    │   ├── core/
    │   │   ├── config.py        ← Settings (pydantic-settings, reads env vars)
    │   │   └── security.py      ← JWT creation/decode, bcrypt hashing
    │   ├── db/
    │   │   └── session.py       ← SQLAlchemy engine, SessionLocal, get_db
    │   ├── models/
    │   │   ├── user.py          ← User (tier, privacy controls, gamification)
    │   │   ├── event.py         ← Event (exclusivity window, attendee cap)
    │   │   ├── event_member.py  ← EventMember (upload_count, has_access)
    │   │   ├── photo.py         ← Photo + PhotoTag (face tags, S3 keys)
    │   │   └── friendship.py    ← FaceEmbedding + Friendship
    │   ├── schemas/
    │   │   ├── auth.py          ← Token, LoginRequest
    │   │   ├── user.py          ← UserCreate, UserMe, UserPublic, UserUpdate
    │   │   ├── event.py         ← EventCreate, EventPublic, EventJoinResponse
    │   │   └── photo.py         ← PhotoPublic, PhotoUploadResponse, GalleryPhoto
    │   ├── services/
    │   │   ├── storage.py       ← MinIO/S3 upload, presigned URLs
    │   │   ├── deepface.py      ← DeepFace HTTP client, cosine distance matching
    │   │   └── photo_service.py ← Full upload pipeline (thumbnail, faces, tags)
    │   ├── api/
    │   │   ├── deps.py          ← get_current_user, require_pro, require_business
    │   │   └── routes/
    │   │       ├── auth.py      ← /auth/register, /auth/login, /auth/me
    │   │       ├── users.py     ← /users/me, /users/{username}, selfie, friends
    │   │       ├── events.py    ← /events/ CRUD + join + members/leaderboard
    │   │       ├── photos.py    ← /events/{id}/photos/ upload + gallery
    │   │       └── admin.py     ← /admin/health, tier upgrade, storage init
    │   └── utils/               ← (reserved for future helpers)
    └── tests/
        ├── conftest.py          ← SQLite in-memory test DB, fixtures, helpers
        ├── test_auth.py         ← Register, login, JWT, /me
        ├── test_events.py       ← Create, join, access control, leaderboard
        └── test_users.py        ← Profile, privacy, friends, tier upgrade
```

---

## Quick Start

### 1. Run everything with Docker Compose

```bash
cd photome
docker compose up --build
```

Services started:
| Service | URL |
|---|---|
| **API + Swagger UI** | http://localhost:8000/docs |
| **ReDoc** | http://localhost:8000/redoc |
| **MinIO Console** | http://localhost:9001 (minioadmin / minioadmin) |
| **PostgreSQL** | localhost:5432 |
| **DeepFace** | http://localhost:5000 |

> **Note:** First startup downloads DeepFace model weights (~300 MB). Be patient on the first `docker compose up`.

Alembic migrations run automatically before uvicorn starts (see `command` in docker-compose.yaml).

---

## API Overview

### Auth

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/auth/register` | Create account |
| `POST` | `/api/v1/auth/login` | OAuth2 form login → JWT |
| `POST` | `/api/v1/auth/login/json` | JSON login (easier for testing) |
| `GET` | `/api/v1/auth/me` | Current user |

### Users

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/users/me` | My full profile |
| `PATCH` | `/api/v1/users/me` | Update profile / privacy settings |
| `POST` | `/api/v1/users/me/change-password` | Change password |
| `POST` | `/api/v1/users/me/selfie` | Upload selfie → register face embedding |
| `GET` | `/api/v1/users/{username}` | Public profile |
| `GET` | `/api/v1/users/me/friends` | Friend list |
| `POST` | `/api/v1/users/me/friends/{username}` | Send friend request |
| `PATCH` | `/api/v1/users/me/friends/{id}/accept` | Accept friend request |

### Events

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/events/` | Create event (**Pro/Business only**) |
| `GET` | `/api/v1/events/` | My events |
| `GET` | `/api/v1/events/discover?q=...` | Search public events |
| `GET` | `/api/v1/events/{id}` | Event detail |
| `POST` | `/api/v1/events/{id}/join` | Join event |
| `PATCH` | `/api/v1/events/{id}` | Update event (creator only) |
| `DELETE` | `/api/v1/events/{id}` | Archive event (creator only) |
| `GET` | `/api/v1/events/{id}/members` | Member leaderboard |

### Photos

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/events/{id}/photos/` | Upload photo (triggers face recognition) |
| `GET` | `/api/v1/events/{id}/photos/` | Gallery (locked view for Basic without access) |
| `GET` | `/api/v1/events/{id}/photos/my` | Photos featuring me |
| `DELETE` | `/api/v1/events/{id}/photos/{photo_id}` | Soft delete |

### Admin / Testing

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/admin/health` | Health check |
| `GET` | `/api/v1/admin/deepface/health` | DeepFace connectivity |
| `POST` | `/api/v1/admin/storage/init` | Create MinIO bucket |
| `POST` | `/api/v1/admin/users/me/tier?tier=pro` | Upgrade tier (testing only) |

---

## Testing Flow (curl / Swagger UI)

```bash
BASE=http://localhost:8000/api/v1

# 1. Register
curl -X POST $BASE/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","username":"alice","password":"secret123"}'

# 2. Login
TOKEN=$(curl -s -X POST $BASE/auth/login/json \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"secret123"}' | jq -r .access_token)

# 3. Upgrade to Pro (so you can create events)
curl -X POST "$BASE/admin/users/me/tier?tier=pro" \
  -H "Authorization: Bearer $TOKEN"

# 4. Create an event
EVENT_ID=$(curl -s -X POST $BASE/events/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Summer Party","visibility":"public"}' | jq -r .id)

# 5. Upload a photo
curl -X POST $BASE/events/$EVENT_ID/photos/ \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/photo.jpg"

# 6. Register your face for recognition
curl -X POST $BASE/users/me/selfie \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/selfie.jpg"

# 7. View gallery
curl $BASE/events/$EVENT_ID/photos/ \
  -H "Authorization: Bearer $TOKEN"
```

---

## Running Tests Locally

Tests use SQLite in-memory — no Docker required.

```bash
cd photome/photome-backend

# Install deps (inside a venv)
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Run tests
pytest tests/ -v
```

---

## Tier Model

| Feature | Basic (Free) | Pro (£2.99/mo) | Business (£15.99/mo) |
|---|---|---|---|
| Join events | ✅ | ✅ | ✅ |
| View gallery (locked until threshold) | After 5 uploads | Immediate | Immediate |
| Create events | ❌ | ✅ (max 50) | ✅ (max 500) |
| High-res downloads | ❌ | ✅ | ✅ |
| Analytics dashboard | ❌ | ❌ | ✅ |

Tier is upgraded via `POST /api/v1/admin/users/me/tier` during development. In production, this would be triggered by a Stripe webhook.

---

## Environment Variables

All config lives in `app/core/config.py` (pydantic-settings). Values are read from environment variables or `.env`:

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://myuser:mypassword@postgres:5432/mydb` | Postgres connection |
| `SECRET_KEY` | (must override in prod) | JWT signing key |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `10080` (7 days) | Token lifetime |
| `S3_ENDPOINT_URL` | `http://minio:9000` | MinIO endpoint |
| `S3_BUCKET` | `photome` | Bucket name |
| `DEEPFACE_URL` | `http://deepface:5000` | DeepFace service |
| `DEEPFACE_DISTANCE_THRESHOLD` | `0.4` | Face match sensitivity (lower = stricter) |
| `UPLOAD_THRESHOLD` | `5` | Photos required to unlock gallery |
