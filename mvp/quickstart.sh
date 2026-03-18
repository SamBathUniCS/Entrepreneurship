#!/bin/bash
# PhotoMe Quick Start — run from the project ROOT (where docker-compose.yaml lives)

set -e

echo "╔════════════════════════════════════════════════╗"
echo "║       PhotoMe Quick Start Setup                ║"
echo "╚════════════════════════════════════════════════╝"
echo ""
echo "This will:"
echo "  1. Build and start all Docker services"
echo "  2. Run database migrations"
echo "  3. Create 10 test users, 5 events, 15 friendships, and sample photos"
echo ""

# ── Preflight ──────────────────────────────────────────────────────────────────
if ! docker info > /dev/null 2>&1; then
  echo "❌ Docker is not running. Please start Docker first."
  exit 1
fi
echo "✓ Docker is running"

if [ ! -f "docker-compose.yaml" ]; then
  echo "❌ docker-compose.yaml not found."
  echo "   Run this script from the project root — the folder containing"
  echo "   docker-compose.yaml, photome-backend/ and photome-frontend/."
  exit 1
fi
echo "✓ Found docker-compose.yaml"
echo ""

# ── Step 1: Build + start ──────────────────────────────────────────────────────
echo "Step 1/4: Building and starting all services (this may take a few minutes)…"
docker compose up -d --build
echo ""

# ── Step 2: Wait for backend ───────────────────────────────────────────────────
echo "Step 2/4: Waiting for backend to be ready…"
TRIES=0
until docker compose exec -T backend python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/v1/admin/health')" > /dev/null 2>&1; do
  TRIES=$((TRIES + 1))
  if [ "$TRIES" -ge 40 ]; then
    echo ""
    echo "⚠️  Backend didn't respond after 80 s."
    echo "   Check what's wrong: docker compose logs backend"
    exit 1
  fi
  printf "."
  sleep 2
done
echo ""
echo "✓ Backend is up"
echo ""

# ── Step 3: Migrations (idempotent) ───────────────────────────────────────────
echo "Step 3/4: Running database migrations…"
docker compose exec -T backend alembic upgrade head
echo "✓ Migrations done"
echo ""

# ── Step 4: Seed — pass --yes so the script skips its interactive prompt ───────
echo "Step 4/4: Seeding test users, events and photos…"
docker compose exec -T backend python seed_data.py --yes
echo ""

# ── Done ───────────────────────────────────────────────────────────────────────
echo "╔════════════════════════════════════════════════╗"
echo "║  ✓ Setup Complete!                             ║"
echo "╚════════════════════════════════════════════════╝"
echo ""
echo "🌐 Open in your browser:"
echo "   Frontend app  →  http://localhost:8081"
echo "   API docs      →  http://localhost:8000/docs"
echo "   MinIO console →  http://localhost:9001  (minioadmin / minioadmin)"
echo ""
echo "📝 Test accounts (password: letmeinbro)"
echo "   sushil@photome.app   — Business tier"
echo "   gabriel@photome.app  — Pro tier"
echo "   nico@photome.app     — Pro tier"
echo "   kit@photome.app      — Basic tier"
echo "   (+ 6 more: boff, saniya, alex, maya, jordan, taylor)"
echo ""
echo "📅 Pre-created events:"
echo "   • Summer BBQ 2026        (public)"
echo "   • Mountain Hiking Trip   (public)"
echo "   • Maya's 25th Birthday   (private)"
echo "   • Beach Day Vibes        (public)"
echo "   • Concert Night          (public)"
echo ""
echo "⏳ Note: DeepFace downloads ~300 MB of model weights on first boot."
echo "   Face recognition won't work until that finishes (2–5 min)."
echo "   Watch progress: docker compose logs -f deepface"
echo ""
echo "📚 Useful commands:"
echo "   docker compose logs -f backend    — backend logs"
echo "   docker compose logs -f frontend   — frontend logs"
echo "   docker compose down               — stop everything (keeps data)"
echo "   docker compose down -v            — stop + wipe all data"
echo "   ./seed.sh                         — wipe data and re-seed"
