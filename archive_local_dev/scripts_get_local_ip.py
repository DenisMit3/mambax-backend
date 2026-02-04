import socket
import qrcode
import sys

def get_local_ip():
    """
    Get the local IP address of the machine on the network.
    Uses a dummy connection to Google DNS to determine the outgoing interface.
    """
    try:
        # Create a socket connection to a public DNS server
        # We don't actually send data, just need to know which interface matches
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            local_ip = s.getsockname()[0]
            
        print(f"\n========================================")
        print(f"✅ LOCAL NETWORK ACCESS ENABLED")
        print(f"========================================")
        print(f"🔹 Local IP:   {local_ip}")
        print(f"🔸 Frontend:   http://{local_ip}:3000")
        print(f"🔸 Backend:    http://{local_ip}:8001")
        print(f"========================================\n")
        
        # Generate QR Code
        url = f"http://{local_ip}:3000"
        
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=1,
            border=1,
        )
        qr.add_data(url)
        qr.make(fit=True)
        
        print(f"📱 SCAN THIS QR CODE TO OPEN ON MOBILE:")
        print(f"   (URL: {url})\n")
        
        qr.print_ascii(invert=True)
        print(f"\n========================================\n")
        
        return local_ip
        
    except Exception as e:
        print(f"⚠️ Could not determine local IP: {e}")
        return "127.0.0.1"

if __name__ == "__main__":
    try:
        get_local_ip()
    except ImportError:
        print("Please install qrcode library: pip install qrcode")
        # Fallback without QR
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            print(f"Local IP: {s.getsockname()[0]}")

