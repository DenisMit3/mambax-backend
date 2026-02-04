
import httpx
import os
from dotenv import load_dotenv

load_dotenv(".env")
load_dotenv("backend/.env")

KEY = os.getenv("GEMINI_API_KEY")

def test_gemini_http():
    # Gemini API via REST
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={KEY}"
    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [{
            "parts": [{"text": "Write a one-sentence dating bio."}]
        }]
    }
    
    print(f"Testing Gemini REST API...")
    try:
        with httpx.Client() as client:
            resp = client.post(url, json=payload, headers=headers, timeout=10)
            print(f"Status: {resp.status_code}")
            print(f"Response: {resp.text}")
    except Exception as e:
        print(f"Caught Exception: {e}")

if __name__ == "__main__":
    test_gemini_http()
