@echo off
cd /d "%~dp0"
echo Client app only (no license/update servers)
call Start-SA-Invoice.bat
