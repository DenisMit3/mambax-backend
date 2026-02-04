
import requests
import json
import sys

def test_otp():
    url = "http://127.0.0.1:8001/auth/request-otp"
    payload = {"identifier": "1234567890"}
    
    print(f"Sending POST to {url} with {payload}")
    try:
        resp = requests.post(url, json=payload)
        print(f"Status Code: {resp.status_code}")
        try:
            print("Response:", resp.json())
        except:
            print("Response Text:", resp.text)
            
    except requests.exceptions.ConnectionError:
        print("Could not connect to backend. Is it running?")

if __name__ == "__main__":
    test_otp()
