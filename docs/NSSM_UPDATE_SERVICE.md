# Silent update Windows Service (NSSM)

1. Download NSSM: https://nssm.cc/download
2. Install Python 3 on the PC, open admin CMD in app folder.
3. Create config:
   ```
   update_service_config.json
   { "updateServerUrl": "http://127.0.0.1:5056", "intervalMinutes": 30, "autoApply": true }
   ```
4. Install service:
   ```
   nssm install SAInvoiceUpdate
   ```
   - Path: `C:\Path\to\python.exe`
   - Arguments: `C:\Path\to\sa-invoice-v1\update_service.py --loop`
   - Startup directory: `C:\Path\to\sa-invoice-v1`

5. `nssm start SAInvoiceUpdate`

Optional: package `update_service.py` with PyInstaller:
```
pyinstaller --onefile --name SAInvoiceUpdateService update_service.py
nssm install SAInvoiceUpdate "%CD%\dist\SAInvoiceUpdateService.exe" --loop
```
