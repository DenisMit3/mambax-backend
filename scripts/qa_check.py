import asyncio
import httpx
import sys
import os
import sqlite3

# Add backend to path to import settings if needed, though we'll try to rely on external requests
sys.path.append(os.path.join(os.getcwd(), 'backend'))

BASE_URL = "http://localhost:8001"
FRONTEND_URL = "http://localhost:3000"

async def check_qa():
    results = []
    
    # ==========================================
    # QA-001: Docker/Service Up
    # ==========================================
    backend_up = False
    frontend_up = False
    
    # Check Backend
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{BASE_URL}/docs", timeout=2.0)
            if resp.status_code == 200:
                backend_up = True
    except Exception:
        pass

    # Check Frontend
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(FRONTEND_URL, timeout=2.0)
            if resp.status_code == 200:
                frontend_up = True
    except Exception:
        pass
        
    status_001 = "PASS" if (backend_up) else "FAIL (Backend Down)" # Frontend might be optional/mocked here but let's focus on backend
    if not frontend_up: status_001 += " (Frontend Unreachable)"
    
    results.append(f"| QA-001 | Docker/Services Up | Backend 200 /docs | {status_001} |")

    # ==========================================
    # QA-002: DB Health
    # ==========================================
    # We check data directly in mambax.db (SQLite) for reliability if server is down,
    # or use the server if up. Let's check the file directly to be sure about "Data".
    
    user_count = 0
    # Try root first, then backend/
    db_path = "mambax.db"
    if not os.path.exists(db_path):
        db_path = os.path.join("backend", "mambax.db")

    try:
        if os.path.exists(db_path):
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM users")
            user_count = cursor.fetchone()[0]
            conn.close()
            if user_count >= 5:
                db_status = f"PASS ({user_count} users)"
            else:
                db_status = f"WARN ({user_count} users < 5)"
        else:
            db_status = "FAIL (No DB File)"
    except Exception as e:
        db_status = f"FAIL ({str(e)})"

    results.append(f"| QA-002 | DB Health          | SELECT COUNT > 0  | {db_status} |")

    # ==========================================
    # QA-003: Admin Login & System Stats
    # ==========================================
    admin_status = "FAIL (Skipped)"
    
    if backend_up:
        try:
            async with httpx.AsyncClient() as client:
                # 1. Request OTP
                otp_payload = {"identifier": "+79062148253"}
                # Note: The API technically doesn't require requesting OTP to login with debug code 000000 in dev
                # But let's follow flow roughly.
                await client.post(f"{BASE_URL}/auth/request-otp", json=otp_payload) # Add request call
                
                # 2. Login (6 digits OTP after SEC-002)
                login_payload = {
                    "identifier": "+79062148253",
                    "otp": "000000"
                }
                login_resp = await client.post(f"{BASE_URL}/auth/login", json=login_payload)
                
                if login_resp.status_code == 200:
                    token = login_resp.json().get("access_token")
                    headers = {"Authorization": f"Bearer {token}"}
                    
                    # 3. Check System Health (Real Data)
                    sys_resp = await client.get(f"{BASE_URL}/admin/system/health", headers=headers)
                    if sys_resp.status_code == 200:
                        data = sys_resp.json()
                        cpu = data.get("system", {}).get("cpu_usage_percent")
                        if cpu is not None:
                            admin_status = f"PASS (CPU: {cpu}%)"
                        else:
                            print(f"DEBUG: System Health Response: {data}")
                            admin_status = "FAIL (Mock Data?)"
                    else:
                        admin_status = f"FAIL (Health {sys_resp.status_code})"
                else:
                    admin_status = f"FAIL (Login {login_resp.status_code})"
        except Exception as e:
            admin_status = f"FAIL ({str(e)})"
    else:
        admin_status = "FAIL (Backend Down)"

    results.append(f"| QA-003 | Admin Login        | Real System Data  | {admin_status} |")

    # Print Table
    print("+--------+--------------------+-------------------+-----------------------+")
    print("| Ticket | Task               | Criteria          | Status                |")
    print("+--------+--------------------+-------------------+-----------------------+")
    for r in results:
        print(r)
    print("+--------+--------------------+-------------------+-----------------------+")

if __name__ == "__main__":
    asyncio.run(check_qa())
