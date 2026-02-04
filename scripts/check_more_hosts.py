
import socket

def check(host):
    port = 443
    print(f"Checking {host}...")
    try:
        socket.create_connection((host, port), timeout=5)
        print(f"SUCCESS: {host}")
    except Exception as e:
        print(f"FAILED: {host} - {e}")

if __name__ == "__main__":
    hosts = ["api.groq.com", "api.mistral.ai", "api.anthropic.com"]
    for h in hosts:
        check(h)
