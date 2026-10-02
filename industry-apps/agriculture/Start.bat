@echo off
cd /d "%~dp0\..\.."
set SA_FORCE_INDUSTRY=agriculture
call Start-SA-Invoice.bat
