
from google import genai
import os
from dotenv import load_dotenv

load_dotenv(".env")
load_dotenv("backend/.env")

KEY = os.getenv("GEMINI_API_KEY")

def test_new_gemini():
    print(f"Testing with NEW Google GenAI SDK...")
    client = genai.Client(api_key=KEY)
    try:
        response = client.models.generate_content(
            model='gemini-1.5-flash',
            contents='Write one short dating bio for a pianist.'
        )
        print("SUCCESS!")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Caught Exception: {e}")

if __name__ == "__main__":
    test_new_gemini()
