# Grok / AI coding-agent context — SA INVOICE PRO
Last reviewed: 2026-10-28

Read first: [Android Owner Experience Mega Pack](./ANDROID_OWNER_MEGA_PACK.md)

## Repository facts
- Product: SA INVOICE PRO, a React 19 + Vite 6 app.
- Current package version at time of writing: 6.32.0 (verify package.json before each change).
- Main branch: main.
- Frontend repo: https://github.com/dexter187gold/sa-invoice-pro
- Production URL: https://sa-invoice-pro.pcrepairdex.workers.dev
- Cloudflare deployment is driven by GitHub Actions. Check the actual workflow status before claiming a deployment is live.
- Existing checks: `npm run check:exports`, `npm run check:version`, `npm run test:unit`, `npm run build`, `npm run test:e2e`.
- The APK workflow is .github/workflows/build-apk.yml. Inspect its actual implementation before claiming native Android capabilities.

## Current working agreement
- Owner-first, touch-first UX; keep the UI uncluttered and avoid duplicate floating controls.
- Main/More navigation and Command Centre changes must be checked against src/components/Shell.jsx and src/components/QuickActions.jsx before editing.
- Sync status and manual sync behaviour must remain accessible and must distinguish pending, syncing, offline, error and successful sync.
- The app is used on Android browsers; preserve core functionality without native permissions and use progressive enhancement for browser APIs.
- Never ask the user to paste API tokens or secrets into chat, code, docs or issues.
- Do not add broad Android permissions unless a feature truly requires them; document rationale and fallback.
- Gestures supplement visible controls; they never replace accessible actions.
- For Android 12–17, use capability detection and test actual browser/WebView builds. Do not claim full compatibility without evidence.
- Treat this context as guidance, not a substitute for source inspection. Confirm current source and tests before changes.
- Do not implement thousands of speculative features in one giant commit. Break the plan into small, testable vertical slices with clear acceptance criteria and rollback paths.

## Agent completion format
For each change, report: user-facing result, files changed, tests actually run and outcomes, commit SHA, deployment run/status, and known limitations. If a test or deployment has not run, say so explicitly.
