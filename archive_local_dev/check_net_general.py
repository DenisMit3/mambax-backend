
import socket

def check(host):
    port = 443
    print(f"Checking connection to {host}...")
    try:
        socket.create_connection((host, port), timeout=5)
        print(f"Connection to {host} successful!")
    except Exception as e:
        print(f"Connection to {host} failed: {e}")

if __name__ == "__main__":
    check("google.com")
    check("api.openai.com")
    check("api.deepseek.com")
