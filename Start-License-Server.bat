@echo off
setlocal EnableExtensions
title SA Invoice Pro - License Server
cd /d "%~dp0"

set PORT=5055

echo.
echo  ========================================
echo    SA Invoice Pro - License Server
echo    (Creator / Vendor only)
echo  ========================================
echo.
echo  Folder: %CD%
echo  Port:   %PORT%
echo.

REM ----- Reset port 5055 (same idea as app launcher on 8080) -----
echo  Freeing port %PORT% if in use...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%PORT% " ^| findstr "LISTENING"') do (
  if not "%%a"=="0" (
    echo  Ending PID %%a on port %PORT%...
    taskkill /F /PID %%a >nul 2>&1
  )
)
REM Brief wait so Windows releases the port
timeout /t 1 /nobreak >nul

REM Prefer built exe if present
if exist "SA-License-Server.exe" (
  echo  Starting SA-License-Server.exe ...
  start "" "SA-License-Server.exe"
  echo.
  echo  Server should open http://127.0.0.1:%PORT%/
  echo  Keep that window open while licensing clients.
  echo.
  exit /b 0
)

where python >nul 2>&1
if %ERRORLEVEL%==0 (
  echo  Checking Flask...
  python -m pip show flask >nul 2>&1
  if errorlevel 1 (
    echo  Installing Flask...
    python -m pip install flask
  )
  echo  Starting license_server.py on port %PORT%...
  echo.
  python license_server.py
  if errorlevel 1 (
    echo.
    echo  Server exited with an error.
    pause
  )
  exit /b %ERRORLEVEL%
)

where py >nul 2>&1
if %ERRORLEVEL%==0 (
  py -m pip install flask >nul 2>&1
  echo  Starting license_server.py ...
  py license_server.py
  if errorlevel 1 pause
  exit /b %ERRORLEVEL%
)

echo  Python not found. Install Python or build the EXE - see MAKE-EXE.txt
pause
exit /b 1
