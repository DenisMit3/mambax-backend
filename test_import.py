import sys
print("Python works", file=sys.stderr)
print("Python works stdout")

try:
    from backend.main import app
    print("Import OK")
except Exception as e:
    print(f"Import failed: {e}")
    import traceback
    traceback.print_exc()
