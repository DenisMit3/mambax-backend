
import os
import google.generativeai as genai

KEY = "AIzaSyAHLHPX5Vb2l6j0xf2kZ-HkC0tOssqdz7E"
OUTPUT_FILE = "gemini_test_output.txt"

def run():
    print(f"Configuring Gemini... (saving to {OUTPUT_FILE})")
    genai.configure(api_key=KEY)
    model = genai.GenerativeModel('gemini-pro')
    
    try:
        response = model.generate_content("Write 3 funny dating bios for a cat lover.")
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            f.write(response.text)
        print("Success! Result saved.")
    except Exception as e:
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            f.write(f"Error: {str(e)}")
        print(f"Failed: {e}")

if __name__ == "__main__":
    run()
