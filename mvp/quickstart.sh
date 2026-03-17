#!/bin/bash
# PhotoMe Quick Start — run from the project ROOT (where docker-compose.yaml lives)

set -e

ENGINE=${1:-docker}

echo "╔════════════════════════════════════════════════╗"
echo "║       PhotoMe Quick Start Setup                ║"
echo "╚════════════════════════════════════════════════╝"
echo ""
echo "This will:"
echo "  1. Build and start all services"
echo "  2. Run database migrations"
echo "  3. Create 10 test users, 5 events, 15 friendships, and sample photos"
echo ""

# ── Preflight ─────────────────────────────────────

# Detect engine executable
if ! command -v "$ENGINE" >/dev/null 2>&1; then
  echo "❌ $ENGINE is not installed."
  exit 1
fi

# Docker daemon check, Podman is daemonless
if [ "$ENGINE" = "docker" ]; then
  if ! $ENGINE info >/dev/null 2>&1; then
    echo "❌ Docker daemon is not running."
    exit 1
  fi
  echo "✓ Docker is running"
else
  # Podman
  echo "✓ $ENGINE is installed (daemonless)"
fi

# Check compose availability
COMPOSE=""
if [ "$ENGINE" = "docker" ]; then
  if command -v docker-compose >/dev/null 2>&1; then
    COMPOSE="docker-compose -f mvp/docker-compose.yaml"
  else
    COMPOSE="docker compose -f mvp/docker-compose.yaml"
  fi
elif [ "$ENGINE" = "podman" ]; then
  if podman compose version >/dev/null 2>&1; then
    COMPOSE="podman compose -f mvp/docker-compose.yaml"
  elif command -v podman-compose >/dev/null 2>&1; then
    COMPOSE="podman-compose -f mvp/docker-compose.yaml"
  else
    echo "❌ Podman compose not found. Install 'podman-compose' or upgrade Podman >=3.4"
    exit 1
  fi
fi

# Check docker-compose.yaml exists
if [ ! -f "mvp/docker-compose.yaml" ]; then
  echo "❌ mvp/docker-compose.yaml not found."
  echo "Run this script from the project root."
  exit 1
fi

echo "✓ Found mvp/docker-compose.yaml"
echo ""
echo "Using container engine: $ENGINE"

# ── Step 1: Build + start ─────────────────────────
echo "Step 1/4: Building and starting services…"
$COMPOSE up -d --build
echo ""

# ── Step 2: Wait for backend ──────────────────────
echo "Step 2/4: Waiting for backend to be ready…"

TRIES=0
until $COMPOSE exec -T backend python -c \
"import urllib.request; urllib.request.urlopen('http://localhost:8000/api/v1/admin/health')" \
> /dev/null 2>&1; do
  TRIES=$((TRIES + 1))
  if [ "$TRIES" -ge 40 ]; then
    echo ""
    echo "⚠️ Backend didn't respond after ~80 seconds."
    echo "Check logs with:"
    echo "$COMPOSE logs backend"
    exit 1
  fi
  printf "."
  sleep 2
done

echo ""
echo "✓ Backend is up"
echo ""

# ── Step 3: Run migrations ────────────────────────
echo "Step 3/4: Running database migrations…"
$COMPOSE exec -T backend alembic upgrade head
echo "✓ Migrations done"
echo ""

# ── Step 4: Seed data ─────────────────────────────
echo "Step 4/4: Seeding test users, events and photos…"
$COMPOSE exec -T backend python seed_data.py --yes
echo ""

# ── Done ──────────────────────────────────────────
echo "╔════════════════════════════════════════════════╗"
echo "║  ✓ Setup Complete!                             ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

echo "🌐 Open in your browser:"
echo "   Frontend app  →  http://localhost:8081"
echo "   API docs      →  http://localhost:8000/docs"
echo "   MinIO console →  http://localhost:9001 (minioadmin / minioadmin)"
echo ""

echo "📝 Test accounts (password: letmeinbro)"
echo "   sushil@photome.app   — Business tier"
echo "   gabriel@photome.app  — Pro tier"
echo "   nico@photome.app     — Pro tier"
echo "   kit@photome.app      — Basic tier"
echo "   (+ 6 more: boff, saniya, alex, maya, jordan, taylor)"
echo ""

echo "📅 Pre-created events:"
echo "   • Summer BBQ 2026"
echo "   • Mountain Hiking Trip"
echo "   • Maya's 25th Birthday"
echo "   • Beach Day Vibes"
echo "   • Concert Night"
echo ""

echo "⏳ Note: DeepFace downloads ~300MB of model weights on first boot."
echo "Face recognition will work after the download finishes."
echo ""

echo "Watch progress:"
echo "$COMPOSE logs -f deepface"
echo ""

echo "📚 Useful commands:"
echo "$COMPOSE logs -f backend"
echo "$COMPOSE logs -f frontend"
echo "$COMPOSE down"
echo "$COMPOSE down -v"
