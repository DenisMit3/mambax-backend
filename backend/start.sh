#!/bin/bash
set -e

echo "🔍 Waiting for PostgreSQL to be ready..."

# Wait for PostgreSQL using netcat
MAX_RETRIES=30
RETRY_COUNT=0

while ! nc -z postgres 5432 2>/dev/null; do
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
    echo "❌ PostgreSQL is not available after $MAX_RETRIES attempts. Exiting."
    exit 1
  fi
  echo "⏳ PostgreSQL is unavailable - attempt $RETRY_COUNT/$MAX_RETRIES - sleeping 2s..."
  sleep 2
done

echo "✅ PostgreSQL is ready!"

echo "🔄 Running database migrations..."
cd /app

# Run migrations with proper error handling
if alembic upgrade head; then
  echo "✅ Migrations completed successfully!"
else
  echo "⚠️ Migrations failed or already applied. Continuing..."
fi

echo "🚀 Starting FastAPI server on port 8001..."
# Changed port to 8001 to match frontend expectations
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
