#!/bin/bash
# PhotoMe data reset + re-seed — run from project root

set -e

echo "PhotoMe Database Reset & Seeder"
echo "================================"
echo ""
echo "This will:"
echo "  1. Stop all containers and WIPE all data (postgres + minio volumes)"
echo "  2. Restart containers fresh"
echo "  3. Run database migrations"
echo "  4. Seed 10 users, 5 events, 15 friendships, 10 sample photos"
echo ""
read -p "⚠️  This will DELETE ALL DATA. Continue? [y/N]: " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

echo ""
echo "Step 1/5: Stopping containers and wiping volumes…"
docker compose down -v

echo ""
echo "Step 2/5: Starting fresh…"
docker compose up -d

echo ""
echo "Step 3/5: Waiting for backend to be ready…"
TRIES=0
until docker compose exec -T backend python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/v1/admin/health')" > /dev/null 2>&1; do
  TRIES=$((TRIES + 1))
  if [ "$TRIES" -ge 40 ]; then
    echo ""
    echo "⚠️  Backend didn't respond. Check: docker compose logs backend"
    exit 1
  fi
  printf "."
  sleep 2
done
echo ""
echo "✓ Backend is up"

echo ""
echo "Step 4/5: Running migrations…"
docker compose exec -T backend alembic upgrade head

echo ""
echo "Step 5/5: Seeding data…"
docker compose exec -T backend python seed_data.py --yes

echo ""
echo "✓ Complete!"
echo ""
echo "📝 Login credentials (password: letmeinbro)"
echo "   sushil@photome.app  — Business"
echo "   gabriel@photome.app — Pro"
echo "   nico@photome.app    — Pro"
echo "   kit@photome.app     — Basic"
echo "   (+ boff, saniya, alex, maya, jordan, taylor)"
echo ""
echo "🌐 http://localhost:8081"
