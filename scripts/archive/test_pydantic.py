import asyncio
from backend.schemas.user import UserUpdate
from backend.models.user import Gender

def test_pydantic():
    print("Testing Pydantic Enum Validation...")
    try:
        # Test with String
        data = UserUpdate(gender="male", name="Test")
        print(f"✅ String 'male' accepted: {data.gender}")
    except Exception as e:
        print(f"❌ String 'male' FAILED: {e}")

    try:
        # Test with Enum
        data = UserUpdate(gender=Gender.MALE, name="Test")
        print(f"✅ Enum Gender.MALE accepted: {data.gender}")
    except Exception as e:
        print(f"❌ Enum Gender.MALE FAILED: {e}")

if __name__ == "__main__":
    test_pydantic()
