@echo off
cd /d "%~dp0\..\.."
set SA_FORCE_INDUSTRY=retail
call Start-SA-Invoice.bat
