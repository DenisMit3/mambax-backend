#!/bin/bash
set -e

echo "🔍 Waiting for PostgreSQL to be ready on port 5432..."

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

# Ensure we are in the correct directory (though WORKDIR should handle it)
cd /app/backend

echo "🔄 Running database migrations..."
if alembic upgrade head; then
  echo "✅ Migrations completed successfully!"
else
  echo "⚠️ Migrations failed or returned non-zero. Check logs. Continuing anyway..."
fi

echo "🚀 Starting FastAPI server on port 8001..."
# Launch Uvicorn with reloading (for dev) and bind to all interfaces
exec uvicorn main:app --host 0.0.0.0 --port 8001 --reload
