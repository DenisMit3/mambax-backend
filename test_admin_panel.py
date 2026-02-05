import asyncio
import httpx
import sys
import os
from datetime import datetime
import uuid

# Setup Path
sys.path.append(os.getcwd())

# Imports
from backend.db.session import async_session_maker
from backend.models.user import User, UserRole
from backend.core.security import create_access_token
from sqlalchemy import select

BASE_URL = "http://127.0.0.1:8002"

async def get_admin_token():
    async with async_session_maker() as db:
        # Check for any user with admin role
        result = await db.execute(select(User).where(User.role == UserRole.ADMIN))
        admin = result.scalars().first()
        
        if not admin:
            # Try promoting anyone
            result = await db.execute(select(User).limit(1))
            user = result.scalars().first()
            if user:
                user.role = UserRole.ADMIN
                await db.commit()
                admin = user
            else:
                # Create mock admin
                admin = User(
                    name="Test Admin",
                    phone="+79000000000",
                    role=UserRole.ADMIN,
                    is_complete=True,
                    is_active=True,
                    hashed_password="mock"
                )
                db.add(admin)
                await db.commit()
                await db.refresh(admin)
        
        return create_access_token(str(admin.id))

async def test_admin_panel():
    print("🚀 Starting Professional Admin Panel Verification...")
    token = await get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}
    
    endpoints = [
        # --- Dashboard ---
        ("Dashboard: Metrics", "GET", "/admin/dashboard/metrics", None),
        ("Dashboard: Activity", "GET", "/admin/dashboard/activity", None),
        
        # --- Users ---
        ("Users: List", "GET", "/admin/users", None),
        ("Users: Segments", "GET", "/admin/users/segments", None),
        ("Users: High Risk", "GET", "/admin/users/fraud-scores/high-risk", None),
        ("Users: Recalculate Fraud", "POST", "/admin/users/fraud-scores/recalculate", {}),
        
        # --- Moderation ---
        ("Moderation: Stats", "GET", "/admin/moderation/stats", None),
        ("Moderation: Queue", "GET", "/admin/moderation/queue", None),
        ("Verification: Queue", "GET", "/admin/users/verification/queue", None),
        
        # --- Analytics ---
        ("Analytics: Overview", "GET", "/admin/analytics/overview", None),
        ("Analytics: Funnel", "GET", "/admin/analytics/funnel", None),
        ("Analytics: Retention", "GET", "/admin/analytics/retention", None),
        ("Analytics: Realtime", "GET", "/admin/analytics/realtime", None), # Added since some UI might use it
        
        # --- Monetization ---
        ("Monetization: Metrics", "GET", "/admin/monetization/revenue/metrics", None),
        ("Monetization: Trend", "GET", "/admin/monetization/revenue/trend", None),
        ("Monetization: Plans", "GET", "/admin/monetization/plans", None),
        ("Monetization: Promo Codes", "GET", "/admin/monetization/promos", None),
        ("Monetization: Gift Catalog", "GET", "/gifts/catalog", None),
        
        # --- Marketing ---
        ("Marketing: Campaigns", "GET", "/admin/marketing/campaigns", None),
        ("Marketing: Channels", "GET", "/admin/marketing/channels", None),
        ("Marketing: Referrals", "GET", "/admin/marketing/referrals", None),
        
        # --- System ---
        ("System: Health", "GET", "/admin/system/health", None),
        ("System: DB Performance", "GET", "/admin/system/health/database", None),
        ("System: API Stats", "GET", "/admin/system/health/api-stats", None),
        ("System: Audit Logs", "GET", "/admin/system/audit-logs", None),
        ("System: Security Alerts", "GET", "/admin/system/security/alerts", None),
        ("System: Backups", "GET", "/admin/system/backups", None),
        ("System: Feature Flags", "GET", "/admin/system/feature-flags", None),
        ("System: Logs", "GET", "/admin/system/logs", None),
        ("System: Config", "GET", "/admin/system/config", None),
    ]

    async with httpx.AsyncClient(base_url=BASE_URL, timeout=10.0) as client:
        results = []
        for name, method, url, payload in endpoints:
            try:
                if method == "GET":
                    resp = await client.get(url, headers=headers)
                else:
                    resp = await client.post(url, json=payload, headers=headers)
                
                status_code = resp.status_code
                status_text = "PASSED" if status_code == 200 else f"FAILED ({status_code})"
                error_msg = resp.text[:100] if status_code != 200 else ""
                
                results.append({
                    "name": name,
                    "status": status_text,
                    "error": error_msg
                })
                
                icon = "✅" if status_code == 200 else "❌"
                print(f"{icon} {name:30} | {status_text} {error_msg}")
            except Exception as e:
                print(f"❌ {name:30} | ERROR: {str(e)}")
                results.append({"name": name, "status": "ERROR", "error": str(e)})

        print("\n=== FINAL VERIFICATION SUMMARY ===")
        # Group by section
        sections = {
            "Dashboard": ["Dashboard: Metrics", "Dashboard: Activity"],
            "Users Management": ["Users: List", "Users: Segments", "Users: High Risk", "Users: Recalculate Fraud"],
            "Moderation": ["Moderation: Stats", "Moderation: Queue", "Verification: Queue"],
            "Analytics": ["Analytics: Overview", "Analytics: Funnel", "Analytics: Retention"],
            "Monetization": ["Monetization: Metrics", "Monetization: Trend", "Monetization: Plans", "Monetization: Promo Codes"],
            "Marketing": ["Marketing: Campaigns", "Marketing: Channels", "Marketing: Referrals"],
            "System Health": ["System: Health", "System: DB Performance", "System: Logs"]
        }
        
        for section, items in sections.items():
            section_passed = True
            for item in items:
                res = next((r for r in results if r["name"] == item), None)
                if not res or "PASSED" not in res["status"]:
                    section_passed = False
                    break
            
            status_icon = "✅ OK" if section_passed else "❌ FAIL"
            print(f"{section:20}: {status_icon}")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(test_admin_panel())
