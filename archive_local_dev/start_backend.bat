@echo off
cd /d "c:\Users\Denis\Desktop\vse boty\sait znakomstv"
set PYTHONPATH=c:\Users\Denis\Desktop\vse boty\sait znakomstv
set DATABASE_URL=sqlite+aiosqlite:///backend/mambax.db
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8001 --reload
pause
