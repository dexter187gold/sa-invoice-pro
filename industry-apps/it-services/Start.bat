@echo off
cd /d "%~dp0\..\.."
set SA_FORCE_INDUSTRY=it-services
call Start-SA-Invoice.bat
