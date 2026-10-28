# SA INVOICE PRO — Android Owner Experience Mega Pack
**Status:** Product/engineering execution blueprint  
**Updated:** 2026-10-28  
**Repo:** https://github.com/dexter187gold/sa-invoice-pro  
**Purpose:** Single source of truth for owner-first Android/PWA gestures, Android capabilities and permissions, compatibility, security, testing, and implementation priorities. This is a roadmap/specification, not a claim that every feature listed is already implemented.

## 1. Product north star
Build a dependable, fast, touch-first business cockpit for South African small-business owners: invoice, quote, job card, client, payment, stock, tax and sync tasks should be easy with one hand, work in poor connectivity, protect business data, and never surprise the owner with hidden destructive gestures or unnecessary permissions.

Principles:
1. **Owner control first:** important actions are visible, reversible where possible, and auditable.
2. **Offline-aware:** clearly show local save, sync pending, sync success, conflict, and failure as distinct states.
3. **Progressive enhancement:** core invoicing must work in ordinary Android browsers without native permissions.
4. **Permission minimisation:** ask only at the moment a user chooses a feature that needs a permission; explain why and provide a manual fallback.
5. **Accessible touch:** large targets, screen-reader names, keyboard support, reduced motion, strong contrast, no colour-only status.
6. **No pretend capability:** detect support at runtime. Never promise a browser API merely because the phone is Android.
7. **South African fit:** ZAR, VAT settings, POPIA-minded data handling, SARS-related workflows described carefully, and exportable records.

## 2. Owner gesture system
Gestures must be discoverable and must never be the only way to perform an important task. Use visible buttons and accessible alternatives for every gesture.

| Gesture | Recommended behaviour | Guardrails |
|---|---|---|
| Tap | Open item / primary action | Prevent double-submit; show progress |
| Long press on invoice/client/job | Context actions: duplicate, share/export, archive, mark status | Do not execute destructive action on press; open a menu |
| Swipe left on a list row | Reveal secondary actions such as archive or mark paid | Reveal first; require a second tap to commit |
| Swipe right on a list row | Quick action such as call client or mark reviewed, depending on list | Avoid conflicting with Android back gesture at screen edges |
| Pull down | Refresh list / request sync where meaningful | Debounce; do not imply cloud success if offline |
| Pinch zoom | PDF preview / invoice document preview only | Do not hijack browser zoom globally |
| Two-finger gestures | Avoid for core app actions | Poor discoverability and accessibility |
| Edge swipe | Leave to Android/browser navigation | Do not intercept the system back gesture |
| Drag and drop | Reorder dashboard cards or invoice line items when clearly indicated | Provide move-up/down alternatives |
| Tap status indicator (three dots) | Run sync; keep three dots as the recognisable indicator | Button label and tooltip should announce current state; disable while active |
| Back button / Escape | Close topmost sheet, dialog, command centre or menu before leaving route | Respect browser and Android navigation |
| Double tap | Do not assign a critical business action | Accidental activation risk |
| Shake device | Do not use | Accidental, inaccessible, privacy-unfriendly |

### Gesture implementation requirements
- Use Pointer Events where appropriate and set `touch-action` narrowly; never globally disable browser gestures.
- Do not use swipe handlers near screen edges; allow OS back gestures.
- Require a movement threshold and distinguish tap from scroll. Cancel swipe on vertical scrolling.
- Support reduced motion and offer a settings toggle to disable list gestures.
- Use haptics only after an explicit user action and only when a supported, permissionless vibration API is available; never make haptics essential.
- Test gestures with TalkBack, keyboard, large fonts, landscape, foldables, and 320px-wide viewports.
- Provide undo/toast for archive/status changes. Payments, tax settings, deletion, and sending documents require explicit confirmation where appropriate.

## 3. Owner workflow upgrades
### Dashboard
- Owner summary: unpaid/overdue, collected this month, quotes awaiting response, open jobs, low stock, sync state.
- Allow cards to be reordered, hidden, and reset to defaults.
- A single Command Centre / More entry point with search, recent actions, quick-create and shortcuts; avoid duplicate floating buttons.
- One-hand mode: place primary action in a reachable lower zone without covering bottom navigation.
- Home should show “what needs attention” rather than only counts; every metric links to a filtered list.

### Invoices and quotes
- Draft autosave with visible saved/pending indicator.
- Duplicate invoice/quote; convert accepted quote to invoice with explicit review.
- Draft line items, product/service catalogue, discount and VAT validation.
- Share PDF or link using the Android share sheet when available, with download/copy fallback.
- Preview before sending; confirmation includes recipient, document number, amount and channel.
- Status changes must be auditable; do not silently mark an invoice paid from a swipe.
- Warn before leaving a dirty form; retain recoverable drafts.

### Clients and jobs
- Tap phone number to use `tel:`; tap email to use `mailto:`; address opens a map URL. These do not require contacts/location permissions.
- Offer explicit “Add to contacts” only when supported; prefer a vCard download/share flow over reading the address book.
- Job card camera attachment must ask for camera only if the user taps “Take photo”; also offer file/photo picker.
- Job timeline: notes, parts, labour, photos, customer approval and linked invoice.
- Keep sensitive customer data out of analytics, console logs and AI prompts unless the owner explicitly chooses a supported feature and is informed.

### Money, stock and reporting
- Payment recording requires amount, date, method and reference validation; confirm edits and retain audit history.
- CSV/PDF export with date range and clear warning about sensitive files.
- Low-stock thresholds and reorder reminders are opt-in.
- Reports should state date range, currency, VAT assumptions and whether they include unsynced local records.
- Never infer bank balances or claim bank integration unless a real authorised integration exists.

## 4. Android capabilities and permissions
A website/PWA and a native Android APK have different permission models. Implement web capability detection first; request Android native permissions only if a native wrapper actually uses that capability.

| Capability | Web/PWA route | Android/native permission or policy | Recommendation |
|---|---|---|---|
| Install app | Web App Manifest + installability criteria | No runtime permission | Provide install help; installation prompt is browser-controlled |
| Offline app shell | Service worker + Cache Storage | None | Cache static shell; never cache secrets or private API responses by default |
| Local drafts | IndexedDB | None | Encrypt/limit sensitive local storage where practical; logout and shared-device controls |
| Camera/photo | `getUserMedia` requires secure context and browser permission; prefer file/photo picker | Camera permission only for native camera use; Android Photo Picker often avoids broad media permission | Ask only after “Take photo”; offer upload alternative |
| Files/PDF | File input, downloads, File System Access where supported | Native storage access depends on chosen API; avoid broad storage access | Use system picker/share sheet; no legacy all-files permission |
| Share | Web Share API when supported, otherwise download/copy | Native Sharesheet needs no broad permission | Always offer fallback |
| Contacts | `tel:`, `mailto:`, vCard export | Contacts permission only if reading/writing address book natively | Do not request for basic call/email links |
| Location | User-entered address, map links; browser geolocation requires permission | Fine/coarse location permission for native location features | Not needed for invoicing core; request only for a clear user benefit |
| Notifications | Web Push requires support, permission and push setup; permission must follow user gesture | Android 13+ `POST_NOTIFICATIONS` runtime permission for notifications | Opt-in reminders; never block app if denied |
| Background sync | Browser support is variable; foreground retry is reliable fallback | Native background work has OS scheduling/battery constraints | Never promise immediate background sync; show pending queue |
| Biometrics | WebAuthn/passkeys where available; no raw biometric access | Native BiometricPrompt when implemented in APK | Use for re-auth/unlock, not as a replacement for server authorisation |
| Clipboard | Clipboard APIs require secure context and often user gesture | Native clipboard API; avoid reading clipboard without action | Only copy on explicit tap; never inspect clipboard automatically |
| Haptics | Vibration API support varies | Native vibration permission may be needed depending on target/API and use | Optional feedback only; no critical meaning |
| Bluetooth/NFC | Web support limited and browser/device-specific | Native permissions and platform APIs depend on use case | Out of scope until a real business need is validated |
| Phone/SMS | `tel:` / `sms:` links open external app | Direct call/SMS APIs require sensitive permissions and Play policy compliance | Prefer intents/links; do not request direct call/SMS permission by default |
| Calendar | `ics` export or calendar URL | Native calendar permissions only if directly accessing calendar | Prefer add-to-calendar file/link |
| Network state | Browser online/offline events are hints, not proof of API reachability | Native connectivity APIs available in wrapper | Verify server reachability and sync response, not just `navigator.onLine` |
| Secure storage | Browser storage is origin-scoped and not guaranteed against device compromise | Native Keystore can protect keys if wrapper implements it | Do not store API secrets or long-lived refresh tokens in plain local storage |
| Biometrics/device lock | Browser cannot reliably report all device security settings | Native device credential APIs | Do not assume a device is secure from user-agent alone |

### Permission rules
- No permission on first launch for camera, contacts, location, notifications or microphone.
- Explain the feature and data use before the system prompt.
- Ask at point of use; handle denied, permanently denied, revoked and unavailable states.
- Provide a useful non-permission fallback.
- Never ask for SMS, call log, accessibility service, all-files access, or broad contacts/media access unless a clearly justified native feature genuinely requires it and policy allows it.
- Do not request microphone permission for a speculative voice assistant.
- Notifications must be opt-in and user-configurable; Android 13+ requires runtime notification permission for native notifications.
- Store a permission rationale state only where useful; never repeatedly nag after denial.
- For APK releases, document each manifest permission and its purpose in a permission audit.

## 5. Android 12–17 and browser compatibility strategy
Do not gate core features solely on Android version or user-agent strings. Android versions, WebView versions and Chrome versions are not equivalent. Android 17/browser availability can vary by device and release channel; treat it as a compatibility target and validate against actual stable browser builds.

### Support tiers
- **Tier A:** Android 12–14, current stable Chrome and Samsung Internet where available.
- **Tier B:** Android 15–16, current stable Chrome and Samsung Internet.
- **Tier C:** Android 17 devices/browser builds as they become available; run the same capability-based suite and document any confirmed issues.
- **Desktop sanity:** Chromium-based browser and Firefox for shared React/browser behaviour.
- **WebView/APK:** test separately from browser PWA because storage, share, file chooser, navigation and permission behaviour can differ.

### Compatibility rules
- Prefer semantic HTML, standard forms, Pointer Events, CSS Grid/Flexbox, and progressive enhancement.
- Use `@supports` for newer CSS; provide fallback for `color-mix()`, dynamic viewport units and newer selectors.
- Test `100dvh` with `100vh` fallback; account for browser bars, safe-area insets and bottom navigation.
- Use `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)` where relevant.
- Do not rely on hover; all actions must work by tap and keyboard.
- Use Web Share, File System Access, install prompt, vibration, push, background sync and camera APIs only after feature detection.
- Avoid relying on third-party cookies; auth should work with browser privacy protections.
- Handle storage quota, private browsing restrictions, storage eviction and offline startup gracefully.
- Use `navigator.onLine` as a hint only; detect actual request failure and retry with bounded exponential backoff.
- Validate service-worker update lifecycle: inform users, avoid stale chunks after deploy, recover from old-cache/new-bundle mismatch.
- Keep bundle size reasonable; lazy-load expensive PDF/Excel modules and heavy routes.
- Avoid intercepting browser back, zoom, text selection or long-press globally.
- Ensure touch targets are ideally 44–48 CSS px; spacing must prevent accidental taps.
- Support 200% text scaling and landscape layouts without clipping or overlapping the bottom nav.

## 6. Privacy, security and POPIA-minded handling
- Apply data minimisation: only collect data required for the selected feature.
- Use HTTPS everywhere; secure cookies for web auth where architecture permits; protect API endpoints server-side.
- Never place API keys, Cloudflare secrets, signing keys or admin credentials in frontend code, public docs or Grok prompts.
- Treat browser storage as accessible to scripts running on the same origin. Avoid putting secrets there.
- Validate all inputs on the server as well as client; enforce authorisation per company/seat/record.
- Rate-limit login, sync, AI and upload endpoints; add file type/size limits and safe PDF handling.
- AI features should send only the minimum required context, state when data leaves the device, and provide local fallback where feasible.
- Include export, account deletion/retention and privacy preference flows aligned with the actual backend policy.
- Keep audit logs for sensitive business changes, but redact personal/customer details from operational logs.
- Use least privilege for Cloudflare, GitHub and deployment tokens. Never paste secrets into issues, prompts or generated docs.
- Security review before any feature adds a new permission, external data processor, payment flow or background data collection.

## 7. Offline-first sync contract
Sync states must be explicit and consistent:
- **Ready / synced:** last successful server confirmation with timestamp.
- **Pending:** local changes await upload.
- **Syncing:** request in progress; prevent duplicate concurrent sync.
- **Offline:** network unavailable or request cannot reach server.
- **Conflict:** server and local changes need a defined resolution.
- **Error:** sync failed; preserve local data and offer retry.
- **Auth required:** session expired; explain sign-in without discarding drafts.

Rules:
1. Queue idempotent operations with stable IDs.
2. Retry transient failures with exponential backoff and jitter; cap attempts and expose manual retry.
3. Do not treat HTTP 200 alone as full success unless the response confirms accepted records.
4. Use server timestamps/versioning for conflict detection; never silently overwrite newer owner data.
5. Show last sync time and pending count in the sync details.
6. Keep the three-dot sync indicator clickable, accessible and visually distinct from status-only decoration.
7. Sync must not block local invoice creation; unsynced records must be labelled.
8. Avoid repeated toast spam; use a stable status area and actionable error detail.

## 8. Accessibility and interaction quality bar
- WCAG 2.2 AA as the design target.
- Minimum contrast for normal text, visible focus, logical heading order and semantic labels.
- Use `aria-live="polite"` for sync/save status; do not announce every animation frame.
- Dialogs trap focus appropriately, close on Escape, restore focus to opener, and expose a title.
- All icon-only buttons require accessible names and 44px-class targets where practical.
- Never encode status with colour alone; include text or accessible labels.
- Honour `prefers-reduced-motion`.
- TalkBack checks for bottom nav, command centre, invoice forms, confirmation dialogs and toasts.
- Avoid auto-focus that unexpectedly opens the keyboard on mobile.
- Provide undo for reversible actions and clear confirmation for irreversible ones.

## 9. Architecture and implementation guardrails
- React + Vite app; preserve existing routing, AppContext and current UI conventions.
- Keep the PWA and APK paths separate where native capabilities differ.
- Build reusable primitives: `GestureListItem`, `SyncStatusButton`, `PermissionExplainer`, `ShareDocumentAction`, `OfflineBanner`, `UndoToast`, `CommandCentre`.
- Use a capability registry that reports supported/unsupported APIs at runtime; do not duplicate user-agent checks.
- Keep business logic out of gesture handlers; gestures call the same tested actions as visible buttons.
- Feature-flag risky changes; support rollback and keep migrations backwards compatible.
- Never make large blind edits to the whole application. Deliver vertical slices with tests and a changelog entry.
- Avoid introducing dependencies unless they deliver clear value and are compatible with the current Vite/React toolchain.
- Before merging: unit tests, production build, E2E smoke, manual Android checks and deployment verification.

## 10. Delivery roadmap
### P0 — correctness and safe foundations
- [ ] Verify current app build, tests and Cloudflare deployment.
- [ ] Inventory existing Android/PWA manifest, service worker, APK workflow and permissions.
- [ ] Add capability detection and a permission audit document.
- [ ] Define sync states and test pending/error/offline paths.
- [ ] Remove duplicate or conflicting mobile controls; one owner-facing Command Centre entry point.
- [ ] Test navigation and keyboard/back behaviour on mobile.
- [ ] Confirm no secrets are committed.

### P1 — high-value owner workflows
- [ ] Add pull-to-refresh only where it improves list/dashboard behaviour.
- [ ] Add long-press context menu and swipe-to-reveal with visible alternatives and undo.
- [ ] Improve share/export using Web Share with download/copy fallback.
- [ ] Add draft autosave and unsaved-change recovery.
- [ ] Add accessible confirmation/undo patterns for status and archive operations.
- [ ] Improve sync queue status, retry and last-sync details.
- [ ] Add one-hand spacing, safe-area and large-font checks.

### P2 — optional Android integrations
- [ ] Notifications/reminders with opt-in and Android 13+ permission handling if native.
- [ ] Camera attachments with picker fallback and permission rationale.
- [ ] Passkey/WebAuthn support or native biometric re-auth only after threat modelling.
- [ ] Calendar export for job due dates.
- [ ] Home-screen shortcuts/install guidance where supported.
- [ ] Native wrapper integrations only for validated needs.

### P3 — owner intelligence and polish
- [ ] Owner attention dashboard and customisable cards.
- [ ] Recent actions and quick create in Command Centre.
- [ ] Opt-in low-stock and overdue reminders.
- [ ] Guided onboarding for sync, privacy and export.
- [ ] Performance budget, crash diagnostics with privacy-safe telemetry, and support bundle export.
- [ ] Compatibility matrix updated for every tested release.

## 11. Test matrix and release gates
For each supported Android version/browser combination:
- [ ] First launch, consent, sign-in, logout, session expiry.
- [ ] Home/dashboard and all bottom navigation states.
- [ ] Command Centre opens from the intended More/menu trigger and closes correctly.
- [ ] Create/edit/save invoice and quote; duplicate/convert flows.
- [ ] Offline create, refresh, reconnect, sync retry, conflict and auth-expired flow.
- [ ] PDF preview, download, share and file-picker upload.
- [ ] Camera permission grant/deny/revoke if camera is offered.
- [ ] Notification permission grant/deny/revoke if notifications are offered.
- [ ] Back gesture, Android system back, browser back and Escape.
- [ ] Portrait, landscape, small viewport, large text, keyboard open, safe areas.
- [ ] TalkBack and keyboard-only checks.
- [ ] Service-worker update and stale-cache recovery.
- [ ] Performance on a lower-end device and poor network.
- [ ] Confirm no data loss after refresh or app termination during draft editing.
- [ ] Production build + unit tests + E2E tests pass before deployment.

Release gate: no P0/P1 data-loss, auth, permission, sync or navigation bugs. Document any known browser-specific limitation rather than claiming universal compatibility.

## 12. Suggested telemetry (privacy-safe and opt-in where needed)
Useful operational counters: build/version, route error category, sync duration/result category, offline queue count, export failure category and performance timings. Do not log invoice contents, customer names, phone numbers, email addresses, addresses, payment references, access tokens or raw AI prompts. Telemetry must be disclosed, configurable where applicable, and aligned with actual privacy policy.

## 13. AI coding agent / Grok handoff contract
When an AI coding agent works in this repository:
1. Read this document, README, package.json, relevant component and tests before editing.
2. Treat this file as product direction, not proof of implementation.
3. Inspect current code and confirm the feature does not already exist.
4. State intended files and behaviour before a wide change; prefer small commits.
5. Do not fabricate successful tests, deployments, API results or Android permissions.
6. Never reveal or request secrets; use GitHub Actions secrets and least privilege.
7. Keep React components and styles consistent with existing patterns.
8. Add/adjust tests for every behaviour change.
9. Run `npm run check:exports`, `npm run check:version`, `npm run test:unit`, `npm run build`, and `npm run test:e2e` where the environment supports them.
10. Update this document’s implementation status and changelog only when verified.
11. For permission features, document web vs native behaviour and fallback paths.
12. Never say “Android 12–17 fully supported” without a tested matrix. Use capability detection and list actual tested devices/builds.

## 14. Feature status ledger
This is a planning document. Items above are **proposed or validation tasks** unless implementation is separately verified in code and tests. Keep a future ledger with columns: feature, status (planned/in progress/implemented/tested/released), files, tests, platform/browser, release/commit, known limits.

## 15. Changelog
- 2026-10-28: Initial owner-first Android/PWA gesture, permissions, compatibility and AI-agent execution blueprint.
