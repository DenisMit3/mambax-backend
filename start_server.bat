@echo off
cd /d "C:\Users\Denis\Desktop\vse boty\sait znakomstv"
set PYTHONPATH=.
"backend\venv\Scripts\python.exe" run_server.py > stdout.log 2> stderr.log
