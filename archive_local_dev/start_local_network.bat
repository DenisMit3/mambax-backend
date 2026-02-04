@echo off
echo Starting MambaX Local Network Access...

REM Check if python is installed
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo Python is not installed. Please install Python to generate QR codes.
    goto SKIP_QR
)

REM Check if qrcode is installed, install if needed
python -c "import qrcode" >nul 2>nul
if %errorlevel% neq 0 (
    echo Installing qrcode library...
    pip install qrcode >nul
)

REM Show QR code and Local IP
python backend\get_local_ip.py

:SKIP_QR

echo.
echo Starting Docker Containers...
echo Press Ctrl+C to stop.
echo.

docker-compose up

pause
