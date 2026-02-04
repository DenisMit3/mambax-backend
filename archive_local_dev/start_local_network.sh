#!/bin/bash

echo "Starting MambaX Local Network Access..."

# Check if python is installed
if ! command -v python3 &> /dev/null; then
    echo "Python3 is not installed. Please install Python to generate QR codes."
else
    # Check if qrcode is installed
    if ! python3 -c "import qrcode" &> /dev/null; then
        echo "Installing qrcode library..."
        pip3 install qrcode
    fi
    
    # Show QR code and Local IP
    python3 backend/get_local_ip.py
fi

echo ""
echo "Starting Docker Containers..."
echo "Press Ctrl+C to stop."
echo ""

docker-compose up
