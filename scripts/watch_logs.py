
import time
import os
import sys

LOG_FILE = "frontend_logs.txt"

def watch_logs():
    print(f"👀 Watching logs in {LOG_FILE}...")
    print("Press Ctrl+C to stop")
    print("-" * 50)
    
    # Check if file exists, if not wait for create
    while not os.path.exists(LOG_FILE):
        time.sleep(1)
    
    with open(LOG_FILE, "r", encoding="utf-8") as f:
        # Move to end of file
        f.seek(0, 2)
        
        while True:
            line = f.readline()
            if not line:
                time.sleep(0.1)
                continue
            
            # Colorize output
            if "[ERROR]" in line:
                print(f"\033[91m{line.strip()}\033[0m")
            elif "[WARN]" in line:
                print(f"\033[93m{line.strip()}\033[0m")
            elif "[INFO]" in line:
                print(f"\033[94m{line.strip()}\033[0m")
            elif "📱" in line:
                print(f"\033[96m{line.strip()}\033[0m")
            else:
                print(line.strip())

if __name__ == "__main__":
    try:
        watch_logs()
    except KeyboardInterrupt:
        print("\nStopped watching logs")
