@echo off
cd /d "%~dp0"
set PORT=5056
echo Freeing port %PORT%...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%PORT% " ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>&1
timeout /t 1 /nobreak >nul
python -m pip install flask >nul 2>&1
python update_server.py
pause
