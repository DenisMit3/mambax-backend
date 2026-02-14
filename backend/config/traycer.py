# Backend Configuration for Traycer Integration
import os

# API Token for authenticating requests to/from Traycer
TRAYCER_API_TOKEN = os.getenv("TRAYCER_API_TOKEN")

if not TRAYCER_API_TOKEN:
    # Use dummy token if not set — Traycer is optional
    TRAYCER_API_TOKEN = "dummy_token_for_dev_mode"

# Webhook URL to receive tasks from Traycer
TRAYCER_WEBHOOK_URL = os.getenv("TRAYCER_WEBHOOK_URL", "/api/traycer/webhook")
