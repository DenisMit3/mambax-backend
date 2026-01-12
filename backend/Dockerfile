# Backend Dockerfile - Python FastAPI
FROM python:3.11-slim

WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

# Install system dependencies
RUN apt-get update \
    && apt-get install -y \
    postgresql-client \
    build-essential \
    libpq-dev \
    curl \
    netcat-openbsd \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy startup script
COPY start.sh .
RUN chmod +x start.sh

# Copy application code
COPY . .

# Create uploads directory
RUN mkdir -p /app/static/uploads

# Expose port (changed to 8001)
EXPOSE 8001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8001/health || exit 1

# Run startup script
CMD ["./start.sh"]
