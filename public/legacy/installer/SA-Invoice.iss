; Compile with Inno Setup (optional proper installer)
#define MyAppName "SA Invoice Pro"
#define MyAppVersion "2.1.0"
[Setup]
AppName={#MyAppName}
AppVersion={#MyAppVersion}
DefaultDirName={localappdata}\SA-Invoice-Pro
DefaultGroupName=SA Invoice Pro
OutputBaseFilename=SA-Invoice-Pro-Setup
Compression=lzma
SolidCompression=yes
PrivilegesRequired=lowest
[Files]
Source: "..\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs; Excludes: "releases\*,backups\*,*.zip,installer\*"
[Icons]
Name: "{group}\SA Invoice Pro"; Filename: "{app}\Start-SA-Invoice.bat"; WorkingDir: "{app}"
Name: "{userdesktop}\SA Invoice Pro"; Filename: "{app}\Start-SA-Invoice.bat"; WorkingDir: "{app}"
[Run]
Filename: "{app}\Start-SA-Invoice.bat"; Description: "Launch SA Invoice Pro"; Flags: nowait postinstall skipifsilent
