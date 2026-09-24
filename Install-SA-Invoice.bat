@echo off
setlocal
title SA Invoice Pro - Install
set "SRC=%~dp0"
set "DEST=%LOCALAPPDATA%\SA-Invoice-Pro"

echo.
echo  Installing SA Invoice Pro to:
echo  %DEST%
echo.

if not exist "%DEST%" mkdir "%DEST%"

echo  Copying files...
xcopy "%SRC%*" "%DEST%\" /E /I /Y /EXCLUDE:%SRC%install-exclude.txt >nul 2>&1
if errorlevel 1 (
  rem fallback without exclude
  xcopy "%SRC%*" "%DEST%\" /E /I /Y >nul
)

echo  Creating Start Menu shortcut...
powershell -NoProfile -Command ^
  "$s=(New-Object -ComObject WScript.Shell); $p=$s.SpecialFolders('Programs')+'\SA Invoice Pro.lnk'; $l=$s.CreateShortcut($p); $l.TargetPath='%DEST%\Start-SA-Invoice.bat'; $l.WorkingDirectory='%DEST%'; $l.IconLocation='%DEST%\icons\logo.svg'; $l.Save()"

echo.
echo  Done. Launch from Start Menu "SA Invoice Pro" or:
echo  %DEST%\Start-SA-Invoice.bat
echo.
pause
