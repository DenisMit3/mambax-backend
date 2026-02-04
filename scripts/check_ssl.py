
import socket
import ssl

def check(host, port=443):
    print(f"Checking {host}:{port}...")
    try:
        # Simple TCP check
        sock = socket.create_connection((host, port), timeout=5)
        # SSL wrap check
        context = ssl.create_default_context()
        with context.wrap_socket(sock, server_hostname=host) as ssock:
            print(f"SSL connection to {host} successful! Version: {ssock.version()}")
    except Exception as e:
        print(f"FAILED: {host} - {e}")

if __name__ == "__main__":
    check("api.groq.com")
    check("api.deepseek.com")
    check("api.openai.com")
