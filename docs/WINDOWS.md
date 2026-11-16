# Windows desktop options for SA Invoice Pro

Goal: a **stable Windows desktop** experience that reuses the same React + IndexedDB app (no rewrite).

## Recommended path (phase 1): PWA + Windows install

The production app at https://sa-invoice-pro.pages.dev already works in **Edge/Chrome on Windows**.

1. Open the site in Edge
2. Install as app (⋯ → Apps → Install this site as an app)
3. Pin to taskbar / Start

**Pros:** zero native packaging, same APK feature set via browser, auto-updates from Pages.  
**Cons:** offline depends on service worker; no true OS tray integration yet.

## Phase 2: Tauri 2 (preferred native shell)

Wrap the Vite build in a thin **Tauri 2** Windows shell:

- WebView2 (ships with Windows 10/11)
- Small installer (~5–15 MB vs Electron)
- Optional: file system access for backups outside the browser sandbox
- Code signing with a standard Authenticode cert for SmartScreen

Rough steps:
1. `npm create tauri-app` alongside existing Vite root (or monorepo `apps/desktop`)
2. Point `devUrl` / `frontendDist` at the existing Vite `dist/`
3. CI job: `tauri build --target x86_64-pc-windows-msvc` on `windows-latest`
4. Publish `.msi` / `.exe` to GitHub Releases next to the APK

## Phase 3: Electron (fallback)

Only if Tauri WebView2 issues appear on older corporate images. Heavier binary; same React bundle.

## Data & backup parity

Desktop shells should keep:
- Same IndexedDB schema (v7+)
- Streaming import / OPFS where WebView supports it
- Explicit “Export backup JSON” always available (already in Settings → Data)

## Security notes

- Sign installers (Authenticode)
- Do not embed license secrets in the desktop binary
- Reuse existing cloud license + HWID checks; desktop can use a stable machine id API via Tauri command

## Suggested order

1. Document PWA install for Windows users (Support page link) — low effort
2. Tauri scaffold + CI artifact on `windows-latest`
3. Code signing + auto-update channel
4. Optional native file picker for multi-GB backups
