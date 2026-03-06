#!/bin/bash
# PhotoMe Quick Start - One command setup

set -e

echo "╔════════════════════════════════════════════════╗"
echo "║       PhotoMe Quick Start Setup                ║"
echo "╚════════════════════════════════════════════════╝"
echo ""
echo "This will:"
echo "  1. Start all Docker services"
echo "  2. Run database migrations"
echo "  3. Seed test data (10 users, 5 events)"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

echo "✓ Docker is running"
echo ""

# Check if docker-compose.yaml exists
if [ ! -f "docker-compose.yaml" ]; then
    echo "❌ docker-compose.yaml not found. Run this from photome-backend/ directory."
    exit 1
fi

echo "Step 1/4: Starting services..."
docker compose up -d --build

echo ""
echo "Step 2/4: Waiting for services to be ready (20 seconds)..."
sleep 20

echo ""
echo "Step 3/4: Running database migrations..."
docker compose exec backend alembic upgrade head

echo ""
echo "Step 4/4: Seeding test data..."
docker compose exec backend python seed_data.py

echo ""
echo "╔════════════════════════════════════════════════╗"
echo "║  ✓ Setup Complete!                             ║"
echo "╚════════════════════════════════════════════════╝"
echo ""
echo "📝 Login credentials:"
echo "   Email: sushil@photome.app (or gabriel@, nico@, etc.)"
echo "   Password: letmeinbro"
echo ""
echo "🌐 Next steps:"
echo "   1. Open photome-tester.html in your browser"
echo "   2. Login with any test user above"
echo "   3. Explore the 5 pre-created events"
echo ""
echo "📚 Useful commands:"
echo "   View logs:    docker compose logs -f backend"
echo "   Stop all:     docker compose down"
echo "   Reset data:   docker compose down -v && ./quickstart.sh"
echo "   API docs:     http://localhost:8000/docs"
echo ""
