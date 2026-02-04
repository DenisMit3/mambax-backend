
import socket

def check():
    host = "generativelanguage.googleapis.com"
    port = 443
    print(f"Checking connection to {host}...")
    try:
        socket.create_connection((host, port), timeout=10)
        print("Connection successful!")
    except Exception as e:
        print(f"Connection failed: {e}")

if __name__ == "__main__":
    check()
