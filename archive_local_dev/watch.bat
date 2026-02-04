@echo off
title MambaX Auto-Deploy Watcher
echo [INFO] Watching for changes to push to GitHub (and Vercel)...
echo [INFO] Press Ctrl+C to stop.
echo.

:loop
REM Wait 2 seconds
timeout /t 2 /nobreak >nul

REM Check for changes
for /f "delims=" %%i in ('git status --porcelain') do (
    echo [DETECTED] Changes found. Deploying...
    call deploy.bat
    echo [SUCCESS] Waiting for new changes...
    echo.
    REM Wait a bit longer after push to avoid double-triggering
    timeout /t 5 /nobreak >nul
    goto loop
)

goto loop
