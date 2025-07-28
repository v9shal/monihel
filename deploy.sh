#!/bin/bash

set -e  # Exit on any error

echo "🚀 Starting API Monitor deployment..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found! Please create one based on .env.example"
    exit 1
fi

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down

# Clean up old images (optional)
echo "🧹 Cleaning up old images..."
docker image prune -f

# Build and start services
echo "🔧 Building and starting services..."
docker-compose -f docker-compose.prod.yml up --build -d

echo "⏳ Waiting for database to be ready..."
timeout=60
counter=0

while ! docker exec db pg_isready -U vishal -d apimonitor -h localhost > /dev/null 2>&1; do
    counter=$((counter + 1))
    if [ $counter -gt $timeout ]; then
        echo "❌ Database failed to start within $timeout seconds"
        docker-compose logs db
        exit 1
    fi
    echo "Waiting for database... ($counter/$timeout)"
    sleep 1
done

echo "✅ Database is ready!"

echo "⏳ Waiting for API server to be healthy..."
timeout=60
counter=0

while ! docker exec api-server wget --no-verbose --tries=1 --spider http://localhost:3000/api/health > /dev/null 2>&1; do
    counter=$((counter + 1))
    if [ $counter -gt $timeout ]; then
        echo "❌ API server failed to start within $timeout seconds"
        docker-compose logs api-server
        exit 1
    fi
    echo "Waiting for API server... ($counter/$timeout)"
    sleep 1
done

echo "✅ API server is healthy!"

echo ""
echo "🎉 Deployment completed successfully!"
echo "🌐 Frontend: http://localhost"
echo "🔧 API: http://localhost/api"
echo "📊 Health: http://localhost/api/health"
echo ""
echo "To follow logs: docker-compose logs -f"
echo "To stop: docker-compose down"