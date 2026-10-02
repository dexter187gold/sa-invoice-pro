@echo off
cd /d "%~dp0\..\.."
set SA_FORCE_INDUSTRY=professional
call Start-SA-Invoice.bat
