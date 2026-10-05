@echo off
cd /d "%~dp0"
python -m pip install flask >nul 2>&1
python owner_saas_dashboard.py
pause
