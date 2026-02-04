@echo off
TITLE MambaX Full Lan Launcher
echo Starting MambaX for Local Network Debugging...

:: 1. Show Local IP
echo.
python backend\get_local_ip.py
echo.

:: 2. Start Backend (on 127.0.0.1, accessed via Proxy)
echo [1/3] Starting Backend (FastAPI)...
start "MambaX Backend" cmd /k "call backend\venv\Scripts\activate && set REDIS_URL= && set DATABASE_URL=sqlite+aiosqlite:///backend/mambax.db && set TELEGRAM_BOT_TOKEN=8531547163:AAEE2xF6cfTqshbtSVjGktz3bDkj8Pwum0E && set PYTHONPATH=. && set ENVIRONMENT=development && python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8001"

:: 3. Start Frontend (Accessible on LAN)
echo [2/3] Starting Frontend (Next.js)...
start "MambaX Frontend" cmd /k "cd frontend && npm run dev -- -H 0.0.0.0"

:: 4. Start Telegram Bot (Polling)
echo [3/3] Starting Telegram Bot...
start "MambaX Bot" cmd /k "call backend\venv\Scripts\activate && set REDIS_URL= && set DATABASE_URL=sqlite+aiosqlite:///backend/mambax.db && set TELEGRAM_BOT_TOKEN=8531547163:AAEE2xF6cfTqshbtSVjGktz3bDkj8Pwum0E && set PYTHONPATH=. && set ENVIRONMENT=development && python backend/bot.py"

echo.
echo ===================================================
echo     All Systems GO!
echo.
echo     Open on Phone: Look for the IP address above 
echo     (e.g., http://192.168.1.5:3000)
echo ===================================================
echo.
pause
