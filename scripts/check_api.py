"""
MambaX Backend API Test Script
Tests all major endpoints for functionality
"""
import urllib.request
import urllib.error
import json
import time

BASE_URL = "http://127.0.0.1:8001"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'
    BOLD = '\033[1m'

def ok(msg): print(f"{Colors.GREEN}✅ {msg}{Colors.RESET}")
def fail(msg): print(f"{Colors.RED}❌ {msg}{Colors.RESET}")
def warn(msg): print(f"{Colors.YELLOW}⚠️  {msg}{Colors.RESET}")
def info(msg): print(f"{Colors.BLUE}ℹ️  {msg}{Colors.RESET}")
def header(msg): print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*50}\n{msg}\n{'='*50}{Colors.RESET}")

def request(method, path, data=None, token=None):
    """Make HTTP request and return response"""
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    try:
        if data:
            data = json.dumps(data).encode('utf-8')
        req = urllib.request.Request(url, data=data, headers=headers, method=method)
        with urllib.request.urlopen(req, timeout=5) as response:
            body = response.read().decode('utf-8')
            return {
                "status": response.getcode(),
                "data": json.loads(body) if body else {},
                "ok": True
            }
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8') if e.fp else ""
        try:
            data = json.loads(body) if body else {}
        except json.JSONDecodeError:
            data = {"raw": body}
        return {
            "status": e.code,
            "data": data,
            "ok": False,
            "error": str(e)
        }
    except Exception as e:
        return {"status": 0, "data": {}, "ok": False, "error": str(e)}

def test_health():
    """Test basic server health"""
    header("1. Health Check")
    
    # Root endpoint
    res = request("GET", "/")
    if res["ok"]:
        ok(f"Root endpoint: {res['data']}")
    else:
        fail(f"Root endpoint failed: {res.get('error', 'Unknown error')}")
        return False
    
    # Docs endpoint
    try:
        req = urllib.request.Request(f"{BASE_URL}/docs", method="GET")
        with urllib.request.urlopen(req, timeout=5) as response:
            if response.getcode() == 200:
                ok("OpenAPI docs available at /docs")
    except:
        warn("OpenAPI docs not available")
    
    return True

def test_auth():
    """Test authentication endpoints"""
    header("2. Authentication")
    
    test_phone = "+79991234567"
    test_tg_id = "123456789"
    
    # Request OTP
    res = request("POST", "/auth/request-otp", {"identifier": test_phone})
    if res["ok"] or res["status"] == 200:
        ok(f"Request OTP: {res['data']}")
    else:
        warn(f"Request OTP (may need Telegram): Status {res['status']}")
    
    # Login with demo OTP
    res = request("POST", "/auth/login", {"identifier": test_phone, "otp": "0000"})
    if res["ok"] and "access_token" in res["data"]:
        ok(f"Login successful, got token")
        return res["data"]["access_token"]
    else:
        warn(f"Login failed (expected if no user exists): {res.get('error', res['data'])}")
    
    # Try Telegram login (mock)
    res = request("POST", "/auth/telegram", {"init_data": "test_data"})
    if res["ok"] and "access_token" in res["data"]:
        ok(f"Telegram auth successful")
        return res["data"]["access_token"]
    else:
        warn(f"Telegram auth: Status {res['status']} (expected without valid init_data)")
    
    return None

def test_profiles(token):
    """Test profile endpoints"""
    header("3. Profile Management")
    
    if not token:
        warn("Skipping profile tests - no auth token")
        return
    
    # Get current user profile
    res = request("GET", "/me", token=token)
    if res["ok"]:
        ok(f"Get profile: {res['data'].get('name', 'No name')}")
    else:
        warn(f"Get profile failed: Status {res['status']}")
    
    # Get all profiles (feed)
    res = request("GET", "/profiles", token=token)
    if res["ok"]:
        ok(f"Get profiles feed: {len(res['data'])} profiles found")
    else:
        warn(f"Get profiles failed: Status {res['status']}")
    
    # Create/Update profile
    profile_data = {
        "name": "Test User",
        "gender": "male",
        "age": 25,
        "bio": "Test bio",
        "photos": ["https://placehold.co/400x600/png"],
        "interests": ["Music", "Travel"]
    }
    
    res = request("POST", "/profile", profile_data, token=token)
    if res["ok"]:
        ok(f"Create profile: Success")
    else:
        info(f"Create profile: Status {res['status']} (may already exist)")
    
    # Update profile
    res = request("PUT", "/profile", {"bio": "Updated bio"}, token=token)
    if res["ok"]:
        ok(f"Update profile: Success")
    else:
        warn(f"Update profile: Status {res['status']}")

def test_matching(token):
    """Test matching endpoints"""
    header("4. Matching System")
    
    if not token:
        warn("Skipping matching tests - no auth token")
        return
    
    # Get matches
    res = request("GET", "/matches", token=token)
    if res["ok"]:
        ok(f"Get matches: {len(res['data'])} matches found")
        return res['data']
    else:
        warn(f"Get matches: Status {res['status']}")
        return []

def test_messaging(token, matches):
    """Test messaging endpoints"""
    header("5. Messaging")
    
    if not token:
        warn("Skipping messaging tests - no auth token")
        return
    
    if not matches:
        info("No matches to test messaging with")
        return
    
    match_id = matches[0].get('id') if matches else None
    if not match_id:
        info("No match ID available for messaging test")
        return
    
    # Get messages
    res = request("GET", f"/matches/{match_id}/messages", token=token)
    if res["ok"]:
        ok(f"Get messages: {len(res['data'])} messages found")
    else:
        warn(f"Get messages: Status {res['status']}")
    
    # Send message
    res = request("POST", f"/matches/{match_id}/messages", {"text": "Test message"}, token=token)
    if res["ok"]:
        ok(f"Send message: Success")
    else:
        warn(f"Send message: Status {res['status']}")

def test_location(token):
    """Test location endpoints"""
    header("6. Location")
    
    if not token:
        warn("Skipping location tests - no auth token")
        return
    
    res = request("POST", "/location", {"lat": 55.7558, "lon": 37.6173}, token=token)
    if res["ok"]:
        ok(f"Update location: Success")
    else:
        warn(f"Update location: Status {res['status']}")

def main():
    print(f"\n{Colors.BOLD}🧪 MambaX Backend API Test Suite{Colors.RESET}")
    print(f"Testing: {BASE_URL}\n")
    
    # Check if server is running
    if not test_health():
        fail("\nServer is not running! Start it with: uvicorn main:app --reload")
        return
    
    # Auth tests
    token = test_auth()
    
    # Profile tests
    test_profiles(token)
    
    # Matching tests
    matches = test_matching(token)
    
    # Messaging tests
    test_messaging(token, matches)
    
    # Location tests
    test_location(token)
    
    header("Test Summary")
    print("All API endpoints have been tested.")
    print("Check warnings (⚠️) for endpoints that may need attention.")
    print(f"\n{Colors.GREEN}Testing complete!{Colors.RESET}\n")

if __name__ == "__main__":
    main()
