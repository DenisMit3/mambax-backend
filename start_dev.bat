@echo off
cd /d "%~dp0"
TITLE MambaX Dev Launcher
echo ===================================================
echo     Starting MambaX Development Environment
echo ===================================================

:: 1. Start Docker (Database)
echo.
echo [1/3] Starting Database (Docker)...
docker-compose up -d
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to start Docker. Is Docker Desktop running?
    pause
    exit /b
)

:: 2. Start Backend
echo.
echo [2/3] Starting Backend (FastAPI)...
start "MambaX Backend" cmd /k "cd backend && venv\Scripts\activate && uvicorn main:app --reload --port 8000"

:: 3. Start Frontend
echo.
echo [3/3] Starting Frontend (Next.js)...
start "MambaX Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ===================================================
echo     Environment Started!
echo     Frontend: http://localhost:3000
echo     Backend:  http://localhost:8000
echo     Docs:     http://localhost:8000/docs
echo ===================================================
echo.
echo Press any key to stop MambaX...
pause >nul

echo.
echo Stopping Docker containers...
docker-compose down
echo Done.
