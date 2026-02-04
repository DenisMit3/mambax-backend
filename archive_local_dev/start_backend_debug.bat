@echo off
echo Starting Backend Debug...
call backend\venv\Scripts\activate
set DATABASE_URL=sqlite+aiosqlite:///backend/mambax.db
set TELEGRAM_BOT_TOKEN=8531547163:AAEE2xF6cfTqshbtSVjGktz3bDkj8Pwum0E
set PYTHONPATH=.
set ENVIRONMENT=development
echo Env vars set. Starting Uvicorn...
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8001 --log-level debug
