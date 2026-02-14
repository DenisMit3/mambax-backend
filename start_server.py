import sys
import os

log_path = r'C:\Users\Denis\Desktop\vse boty\sait znakomstv\server_log.txt'
log_file = open(log_path, 'w', encoding='utf-8')
sys.stdout = log_file
sys.stderr = log_file

sys.path.insert(0, '.')
os.chdir(r'C:\Users\Denis\Desktop\vse boty\sait znakomstv')

try:
    print("Step 1: importing uvicorn", flush=True)
    import uvicorn
    print("Step 2: uvicorn imported OK", flush=True)
    print("Step 3: starting server...", flush=True)
    uvicorn.run('backend.main:app', host='127.0.0.1', port=8002, reload=False)
except Exception as e:
    print(f"Error: {type(e).__name__}: {e}", flush=True)
    import traceback
    traceback.print_exc(file=log_file)
finally:
    log_file.flush()
    log_file.close()
