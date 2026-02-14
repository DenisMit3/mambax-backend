import sys, os
sys.path.insert(0, '.')
os.chdir(r'C:\Users\Denis\Desktop\vse boty\sait znakomstv')

from dotenv import load_dotenv
load_dotenv('backend/.env')

print("Step 1: imports done", flush=True)

import uvicorn
print("Step 2: uvicorn imported", flush=True)

from backend.main import app
print("Step 3: app imported", flush=True)

print("Step 4: calling uvicorn.run()", flush=True)
uvicorn.run(app, host='127.0.0.1', port=8002)
print("Step 5: uvicorn exited", flush=True)
