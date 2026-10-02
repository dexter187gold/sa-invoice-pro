@echo off
cd /d "%~dp0"
echo Starting License Server + Update Server + App (OWNER)
start "SA-License" cmd /c "Start-License-Server.bat"
timeout /t 2 /nobreak >nul
start "SA-Updates" cmd /c "Start-Update-Server.bat"
timeout /t 2 /nobreak >nul
start "SA-App" cmd /c "Start-SA-Invoice.bat"
echo All started. Close this window if you like.
pause
