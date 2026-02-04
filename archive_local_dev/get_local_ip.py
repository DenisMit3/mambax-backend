
import socket

def get_local_ip():
    try:
        # Connect to a public DNS server to determine the most appropriate local IP
        # This doesn't actually establish a connection
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
        return local_ip
    except Exception:
        return "127.0.0.1"

if __name__ == "__main__":
    ip = get_local_ip()
    print("\n" + "="*50)
    print(f"  LOCAL IP ADDRESS: {ip}")
    print("  Use this IP on your phone to connect:")
    print(f"  Frontend: http://{ip}:3000")
    print("="*50 + "\n")
