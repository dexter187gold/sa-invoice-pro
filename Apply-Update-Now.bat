@echo off
cd /d "%~dp0"
echo Applying update via update_service (no browser needed)...
if not exist update_service_config.json (
  echo {"updateServerUrl":"http://127.0.0.1:5056","intervalMinutes":30,"autoApply":true}> update_service_config.json
)
python update_service.py --once
echo.
echo Done. Restart Start-SA-Invoice.bat
pause
