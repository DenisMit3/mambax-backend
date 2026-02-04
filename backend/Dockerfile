# Backend Dockerfile - Enterprise Grade
# Stage 1: Builder
FROM python:3.11-slim-bookworm as builder

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies into a virtual env
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt .
RUN pip install -r requirements.txt

# Stage 2: Runtime
FROM python:3.11-slim-bookworm

WORKDIR /app

# Create non-root user
RUN groupadd -r mambax && useradd -r -g mambax mambax

# Install runtime dependencies ONLY
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

# Copy virtual env from builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
ENV PYTHONPATH=/app

# Copy application code
# Copy application code to /app/backend to preserve package structure
COPY . ./backend

# Set ownership to non-root user
RUN chown -R mambax:mambax /app

# Switch to non-root user

# Switch to non-root user
USER mambax

# Expose port
EXPOSE 8001

# Health check (matches docker-compose)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8001/health || exit 1

# Make script executable (just in case) and run
# Note: We use absolute path because WORKDIR is /app
# Start uvicorn directly (production mode)
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8001"]
