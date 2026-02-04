
import asyncio
import os
import sys

# Add project root to path
sys.path.append(os.getcwd())

from dotenv import load_dotenv
load_dotenv(".env")
load_dotenv("backend/.env")

from backend.services.ai import ai_service

async def interactive_session():
    print("=== Interactive AI Session (Gemini) ===")
    print(f"Provider: {ai_service.provider}")
    print(f"Key present: {'Yes' if ai_service.gemini_key else 'No'}")
    print("Type 'exit' to quit.\n")

    while True:
        choice = input("\nChoose content type [1: bio, 2: icebreaker, 3: custom]: ").strip()
        
        if choice.lower() == 'exit':
            break
            
        content_type = "bio"
        if choice == "2":
            content_type = "icebreaker"
        elif choice == "3":
            content_type = input("Enter custom content type (e.g. 'flirty_reply'): ")
            
        context = input("Enter context (optional, press Enter to skip): ").strip()
        
        print("\nGenerating...")
        try:
            suggestions, usage = await ai_service.generate_content(
                content_type=content_type,
                context=context if context else None,
                count=3
            )
            
            print("\n--- Results ---")
            for i, s in enumerate(suggestions, 1):
                print(f"{i}. {s}")
            print(f"\nMetadata: {usage}")
            
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    if os.name == 'nt':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    try:
        asyncio.run(interactive_session())
    except KeyboardInterrupt:
        print("\nGoodbye!")
