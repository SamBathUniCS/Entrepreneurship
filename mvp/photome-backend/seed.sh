#!/bin/bash
# Quick seed script runner

set -e

echo "PhotoMe Database Seeder"
echo "======================="
echo ""
echo "This script will:"
echo "  1. Stop all containers"
echo "  2. Wipe all data (postgres + minio volumes)"
echo "  3. Restart containers"
echo "  4. Run database migrations"
echo "  5. Seed test data"
echo ""
read -p "⚠️  This will DELETE ALL DATA. Continue? [y/N]: " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

echo ""
echo "Step 1/5: Stopping containers..."
docker compose down -v

echo ""
echo "Step 2/5: Starting fresh..."
docker compose up -d

echo ""
echo "Step 3/5: Waiting for services to be ready..."
sleep 10

echo ""
echo "Step 4/5: Running migrations..."
docker compose exec backend alembic upgrade head

echo ""
echo "Step 5/5: Seeding data..."
docker compose exec backend python seed_data.py

echo ""
echo "✓ Complete!"
echo ""
echo "Login credentials:"
echo "  Email: sushil@photome.app (or gabriel@, nico@, etc.)"
echo "  Password: letmeinbro"
echo ""
echo "Open photome-tester.html to start testing!"
