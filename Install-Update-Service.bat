@echo off
cd /d "%~dp0"
echo.
echo  SA Invoice Pro – silent update helper
echo  =====================================
echo  Option A (simple): run in background when PC is on
echo    pythonw update_service.py --loop
echo.
echo  Option B (Windows Service via NSSM – recommended):
echo    1. Download NSSM https://nssm.cc/download
echo    2. nssm install SAInvoiceUpdate
echo    3. Path = your python.exe
echo    4. Arguments = "%CD%\update_service.py" --loop
echo    5. Startup directory = %CD%
echo.
echo  Edit update_service_config.json for updateServerUrl.
echo.
if not exist update_service_config.json (
  echo {"updateServerUrl":"http://127.0.0.1:5056","intervalMinutes":30,"autoApply":true}> update_service_config.json
)
echo  Running one check now...
python update_service.py --once
pause
