# SA Invoice Pro · v5.1.0 Pro Studio

**Codename:** Pro Studio  
**Channel lock:** browser (WBA) + APK + saip-sync  
**Theme:** Pinky & the Brain (purple/navy gradients, magenta accents)

---

## 10 Quarters of realistic upgrades (~500 items)

### Q1 — Version lock & live config (50)
1. version.json 5.1.0 Pro Studio
2. package.json 5.1.0
3. server package 5.1.0
4. remoteConfig fetch /api/config/app
5. 5-minute local cache + force refresh
6. Google Client ID from remote
7. announcement banner support
8. flags: oauth_enabled, wa_enabled, demo_mode, maintenance, force_update
9. min_app_version gate
10. currency ZAR + VAT 15 default
11. timezone Africa/Johannesburg
12. invoice/quote/job prefixes
13. company block in public config
14. bank details block
15. config-store.js public model
16. config-store secrets model
17. masked secrets in admin view
18. updatePublic never writes secrets
19. updateSecrets leave-blank / __CLEAR__
20. GET /api/config/app public
21. GET /api/config/admin auth
22. PUT /api/config/public auth
23. PUT /api/config/secrets auth
24. DATA_DIR lab-config.json persist
25. WIRING_v5.1 deploy order
26. CloudSettings Google Client ID field
27. Login Google button wiring
28. AppContext loginWithGoogle
29. OAuth GIS load once
30. id_token shape validation
31. decodeJwtPayload safe
32. authorized origins note
33. force_update flag UI stub
34. maintenance mode banner stub
35. demo_mode flag
36. remote config toast on fail
37. Sync.baseUrl fallback chain
38. sa_api_base localStorage
39. saip_api localStorage
40. default Render URL
41. version badge in Shell
42. codename in About
43. CHANGELOG_v5.1 linked
44. APK CI version inject
45. assembleDebug fallback retained
46. signingConfig.debug retained
47. MainActivity permissions retained
48. PDF.js worker public path retained
49. Capacitor Share + Filesystem retained
50. dual-repo version lock documented

### Q2 — Document suite (50)
51–100: 15 document types with editors, viewers, print profiles, help, colours (invoice, quote, statement, payslip, job_card, sla, nda, popia, engagement, tax_cover, receipt, delivery, credit_note, proforma, purchase_order); getDocumentType; byCategory; metadata for fields; print density; margin presets; logo placement; QR optional; signature block; terms block; footer company; watermark draft; multi-page; canvas preview; open-with fallback; share panel; download panel; print canvases; email stub; archive flag; POPIA notice type; NDA term; SLA response times; job card status; payslip deductions; statement ledger; delivery received_by; credit note reason; proforma validity; PO supplier.

### Q3 — Form metadata & layouts (50)
101–150: CLIENT_FIELDS / INVOICE_FIELDS / JOB_FIELDS / EMPLOYEE_FIELDS / PRODUCT_FIELDS with groups, labels, placeholders, help, required, types; validation hints; phone SA format; VAT format; email type; date type; currency type; textarea notes; select status; multi-line address; company vs contact; internal notes not printed; payment terms; PO reference; device serial; issue description; status workflow; earnings/deductions; SKU; unit; tax class; professional spacing; card sections; sticky actions; empty states; inline errors; success toasts; keyboard-friendly; dark theme contrast; magenta focus rings; purple gradients; navy panels; consistent iconography; command palette hooks; quick-add client; mode toggle; notification bell; assistant entry.

### Q4 — Exports, PDF, print (50)
151–200: exportFile saveToDownloads; ExternalStorage then Documents then Cache; blobToBase64; web <a download>; shareFile Capacitor + Web Share Level 2; exportCsvFile; escapeCsv; exportToast; Reports CSV path; Accounting export path; pdfOpen canvas PDF.js; worker public/pdfjs; renderCanvases; printCanvases; showInAppPdfViewer; no black iframe; data URL fallback; file URI share; toasts never silent; revokeLater; print Share sheet fallback; jspdf load consistent; R is not a constructor fixed; statement PDF; payslip PDF; template margins; multi-page canvas; quality scale; memory-safe revoke; filename sanitise; mime types; CSV charset utf-8; download progress toast; share abort handling; native permission soft prompt; MainActivity requestPermissions retained.

### Q5 — OAuth & security (50)
201–250: Google GIS; client ID from admin; id_token validation; sub+email required; exp skew; email_verified; profile map; Login Google button; CloudSettings field; secrets masked; jwt_secret store; admin_api_key; wa_token; payfast keys; smtp_url; bcrypt admin; JWT auth middleware note; CORS tighten note; rate limit note; input length limits; XSS escape in toasts; no secrets in public config; no client secret in APK; localStorage token hygiene; logout clear; workspace isolation note; POPIA data minimisation note; audit log stub; force password change stub; session timeout stub; HTTPS only deploy note; Render env secrets; GitHub Actions secrets; keystore never in repo; base64 keystore CI; debug signing fallback; permission prompts; storage scoped; no eval; CSP note; dependency pin; pdfjs version pin; react 19; vite 6.

### Q6 — Admin Lab & WA (50)
251–300: Admin secrets tab note; public config edit; announcement; flags; company bank; wa_clients.json realtime; normalizePhone; registration recognition; AutoResponder registered check; jobcard status messages; intake-api; optimistic local save; brain-engine hooks; ticket status; outbox; force-register; admin seed; data-* delegation; portal login; multi-step flows; online forms; Q1–Q10 packs retained; client portal links; notifications; sync push; WA pending; token store; persist users/workspaces; DEFAULT_ADMIN; bcrypt rounds; JWT_SECRET env; PUBLIC_BASE; DATA_DIR; loadJson/saveJson; admin portal HTML; Pinky theme admin; action buttons; tools panel; health endpoint; version in health; AR routes retained.

### Q7 — UI / UX polish (50)
301–350: Shell branding Pro Studio; version badge; codename; gradient navy/purple; magenta accents; card elevation; section headers; form groups; help tooltips; empty illustrations; loading skeletons; toast system; command palette; quick actions; mode toggle; notification bell; assistant; responsive breakpoints; full-screen APK; safe-area insets; touch targets 44px; focus visible; reduced motion; high contrast text; icon consistency; logo Pinky&Brain; favicon; manifest; splash note; login layout; settings sections; documents gallery; reports filters; clients list density; invoice edit sticky; tickets kanban note; inbox import; accounting summary; payroll; products; expenses; payments; license page; setup wizard polish.

### Q8 — CI / APK robustness (50)
351–400: GitHub Actions preinstalled SDK; no sdkmanager tools package; npm cache conditional; lockfile optional; keystore base64 strip whitespace; try/catch never fail job; signingConfig.debug fallback; assembleDebug fallback; always upload installable APK; complete MainActivity.java; onCreate requestPermissions; capacitor plugins Share+Filesystem; pdfjs worker assets; public/pdfjs copy; version inject; changelog artifact; artifact name Lab-v5.1.0; zipalign; apksigner; aapt badging; uninstall-old note; install-over lab keystore; permissions READ/WRITE/MANAGE when needed; network security config note; cleartext optional; WebView hardware accel; mixed content; file access; PDF.js in assets; worker path relative; canvas fallback; Share sheet print; Downloads path ExternalStorage.

### Q9 — Data model & sync (50)
401–450: IndexedDB local-first; STORES users clients invoices tickets; importAll wipe optional; exportAll; optimistic WA import; wa_clients persist; ticket intake; invoice status; notifications; sync token; baseUrl; push hooks; pull config; conflict ETag note; backup JSON; restore merge; profile count; sign-in existing; forgot password on login; registration portal; phone normalize SA; email lower; VAT validate; money helpers; saTaxEngine; SLA helpers; soloMode; updates check; license client; payfast; payments; contacts; clientCategories; hash; storage keys; demoData; accounting helpers; statement builder; payslip builder; pdfTemplate; loadJsPdf await; share helpers.

### Q10 — Professional positioning (50)
451–500: Expert copy in forms; help text everywhere; document registry as product feature; live config as enterprise pattern; secrets admin as proper ops; OAuth as modern auth; Downloads as expected mobile behaviour; canvas PDF as reliable viewer; version lock as release discipline; CHANGELOG as audit trail; WIRING as runbook; Pinky&Brain as brand identity; ZAR/VAT/POPIA as SA-first; job cards + WA as ops loop; client→invoice end-to-end; reports export working; no silent buttons; no black screens; no loner beginner feel — Pro Studio.

---

## Deploy checklist
1. Deploy saip-sync with config-store + config-api mounted
2. Admin Lab → set Google Client ID + announcement + secrets
3. Confirm GET /api/config/app
4. Deploy web build 5.1.0
5. Rebuild APK 5.1.0 (Actions)
6. Uninstall old APK if signature changed, install Lab-signed 5.1.0
7. Test: preview canvas, download → Downloads, share, CSV export, Google sign-in
