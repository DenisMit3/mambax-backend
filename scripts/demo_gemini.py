
import asyncio
import os
import sys

# Add project root
sys.path.append(os.getcwd())

from dotenv import load_dotenv
load_dotenv(".env")
# Ensure key is loaded
if not os.getenv("GEMINI_API_KEY"):
    os.environ["GEMINI_API_KEY"] = "AIzaSyAHLHPX5Vb2l6j0xf2kZ-HkC0tOssqdz7E"

from backend.services.ai import ai_service

async def run_demo():
    print(f"Provider: {ai_service.provider}")
    print("Generating 3 Bio suggestions for context: 'Loves Python and Chess'...")
    
    try:
        suggestions, _ = await ai_service.generate_content(
            content_type="bio",
            context="Loves Python and Chess",
            count=3
        )
        print("\n--- GENERATED BIOS ---")
        for s in suggestions:
            print(f"- {s}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    if os.name == 'nt':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(run_demo())
