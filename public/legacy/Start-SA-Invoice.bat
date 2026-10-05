@echo off
setlocal EnableExtensions
title SA Invoice Pro
cd /d "%~dp0"

echo.
echo  ========================================
echo    SA Invoice Pro
echo  ========================================
echo.
echo  Folder: %CD%
echo.

if not exist "index.html" (
  echo  ERROR: index.html not found in this folder.
  echo  Extract the full ZIP and run this file from inside sa-invoice-v1.
  echo.
  pause
  exit /b 1
)

REM Prefer the fixed Python launcher (in-process server – no loops)
where python >nul 2>&1
if %ERRORLEVEL%==0 (
  echo  Starting with Python launcher...
  python launcher.py
  if errorlevel 1 (
    echo.
    echo  Launcher exited with an error.
    pause
  )
  exit /b %ERRORLEVEL%
)

where py >nul 2>&1
if %ERRORLEVEL%==0 (
  echo  Starting with Python launcher (py)...
  py launcher.py
  if errorlevel 1 pause
  exit /b %ERRORLEVEL%
)

echo  Python was not found on PATH.
echo.
echo  1. Install Python from https://www.python.org/downloads/
echo  2. Tick "Add python.exe to PATH"
echo  3. Restart this window and try again
echo.
echo  OR build the .exe with:
echo     pip install pyinstaller
echo     pyinstaller --onefile --noconsole --name "SA Invoice Pro" launcher.py
echo  then put the .exe next to index.html
echo.
pause
exit /b 1
