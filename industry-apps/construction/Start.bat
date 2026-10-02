@echo off
cd /d "%~dp0\..\.."
set SA_FORCE_INDUSTRY=construction
call Start-SA-Invoice.bat
