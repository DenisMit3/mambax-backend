import sys
import os
import importlib
import logging

# Add project root to path
sys.path.append(os.getcwd())
logging.basicConfig(level=logging.INFO)

print("Starting router debug...")

routers = [
    "backend.api.health",
    "backend.api.auth",
    "backend.api.interaction",
    "backend.api.discovery",
    "backend.api.chat",
    "backend.api.users",
    "backend.api.traycer",
    "backend.api.bot_webhook",
    "backend.api.verification",
    "backend.api.stripe_webhook",
    "backend.api.security",
    "backend.api.ux_features",
    "backend.api.notification",
    "backend.api.safety",
    "backend.api.admin",
    "backend.api.monetization",
    "backend.api.marketing",
    "backend.api.system",
    "backend.api.advanced",
    "backend.api.debug",
]

for router in routers:
    print(f"Testing import: {router}")
    try:
        importlib.import_module(router)
        print(f"✅ {router} imported successfully")
    except Exception as e:
        print(f"❌ {router} FAILED: {e}")
        # We don't stop, to see if others fail too, or if this is the blocker
        pass
    print("-" * 20)

print("Router check complete.")
