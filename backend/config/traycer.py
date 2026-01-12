# Backend Configuration for Traycer Integration

# API Token for authenticating requests to/from Traycer
import os

# API Token for authenticating requests to/from Traycer
TRAYCER_API_TOKEN = os.getenv("TRAYCER_API_TOKEN")

if not TRAYCER_API_TOKEN:
    # Safe default for build/test environments, but strict for production
    if os.getenv("ENVIRONMENT") == "production":
         raise ValueError("TRAYCER_API_TOKEN environment variable is not set")
    TRAYCER_API_TOKEN = "dummy_token_for_dev_mode"

# Webhook URL to receive tasks from Traycer
TRAYCER_WEBHOOK_URL = "http://192.168.1.136:8001/api/traycer/webhook"
