@echo off
TITLE MambaX Lite Launcher
echo Starting MambaX (No Docker Mode)...

:: Start Backend
echo [1/2] Starting Backend...
start "MambaX Backend" cmd /k "call backend\venv\Scripts\activate && set REDIS_URL= && set DATABASE_URL=sqlite+aiosqlite:///backend/mambax.db && set TELEGRAM_BOT_TOKEN=8531547163:AAEE2xF6cfTqshbtSVjGktz3bDkj8Pwum0E && set PYTHONPATH=. && set ENVIRONMENT=development && python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8001"

:: Start Frontend
echo [2/3] Starting Frontend...
start "MambaX Frontend" cmd /k "cd frontend && npm run dev"

:: Start Bot
echo [3/3] Starting Telegram Bot...
start "MambaX Bot" cmd /k "call backend\venv\Scripts\activate && set REDIS_URL= && set DATABASE_URL=sqlite+aiosqlite:///backend/mambax.db && set TELEGRAM_BOT_TOKEN=8531547163:AAEE2xF6cfTqshbtSVjGktz3bDkj8Pwum0E && set PYTHONPATH=. && set ENVIRONMENT=development && python backend/bot.py"

echo.
echo Environment Started!
echo Backend: http://127.0.0.1:8001
echo Frontend: http://localhost:3000
pause
