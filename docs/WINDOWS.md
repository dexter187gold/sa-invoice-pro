# Windows desktop for SA Invoice Pro

## Status (6.68.0)

| Channel | Status |
|---------|--------|
| **PWA (Edge/Chrome)** | Production-ready today |
| **Tauri MSI / NSIS** | CI scaffolded — first artifact appears on Actions + Releases after green Windows job |
| **Code-signed MSI** | Needs Authenticode cert (optional next) |

## Install options

### 1) PWA (recommended until MSI is published)

1. Open https://sa-invoice-pro.pages.dev/ in **Microsoft Edge**
2. ⋯ → **Apps** → **Install this site as an app**
3. Pin to Start / taskbar

### 2) MSI / setup.exe (when CI produces them)

After the **Build Windows desktop (Tauri)** workflow succeeds:

- **Release assets:** https://github.com/dexter187gold/sa-invoice-pro/releases  
  Look for `SA-Invoice-Pro-v*-windows.msi` or `*-windows-setup.exe`
- **Actions artifact:** workflow run → **SA-Invoice-Pro-Windows**

### 3) Local desktop build

```bash
npm install
npm install -D @tauri-apps/cli@2
npm run build
npx tauri build
```

Requires Rust + WebView2 (Windows 10/11).

## Data parity

Desktop shell uses the same Vite bundle, IndexedDB schema, streaming backup, and OPFS recovery paths as the web/APK apps.
