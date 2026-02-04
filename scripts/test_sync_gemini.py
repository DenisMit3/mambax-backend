
import os
import google.generativeai as genai

KEY = "AIzaSyAHLHPX5Vb2l6j0xf2kZ-HkC0tOssqdz7E"

def run():
    print("Configuring Gemini...")
    genai.configure(api_key=KEY)
    model = genai.GenerativeModel('gemini-pro')
    
    print("Sending request...")
    try:
        response = model.generate_content("Write 3 short dating bios for a python programmer.")
        print("\nResponse:")
        print(response.text)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    run()
