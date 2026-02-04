import sys
import os

print(f"CWD: {os.getcwd()}")
print(f"Path: {sys.path}")

try:
    import backend.database
    print("Success: import backend.database")
except Exception as e:
    print(f"Error importing backend.database: {e}")

try:
    from backend.main import app
    print("Success: import backend.main:app")
except Exception as e:
    print(f"Error importing backend.main:app: {e}")
