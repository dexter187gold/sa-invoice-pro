# SA Invoice Pro 6.68.0 — First public beta

**Invoicing, quotes, job tickets, and WhatsApp-ready follow-ups built for South African workshops and small businesses.**

Works offline-first in the browser. Same data on **Web**, **Android**, and **Windows**.

| | |
|---|---|
| **Live app** | https://sa-invoice-pro.pages.dev/ |
| **Downloads** | https://github.com/dexter187gold/sa-invoice-pro/releases/tag/v6.68.0 |
| **Support** | sainvoicepro@gmail.com |
| **Channel** | Public beta |

---

## Install (pick one)

### 1) Web / PWA (fastest — recommended for trials)

1. Open **https://sa-invoice-pro.pages.dev/**
2. On phone: browser menu → **Add to Home Screen**
3. On Windows: **Microsoft Edge** → ⋯ → **Apps** → **Install this site as an app**

No install package required. Data stays on the device (IndexedDB).

### 2) Android APK

1. Download: [SA-Invoice-Pro-Lab-v6.68.0.apk](https://github.com/dexter187gold/sa-invoice-pro/releases/download/v6.68.0/SA-Invoice-Pro-Lab-v6.68.0.apk)
2. Allow install from unknown sources if prompted
3. Open the APK and install

### 3) Windows

| Package | Link |
|---------|------|
| **MSI installer** | [SA-Invoice-Pro-v6.68.0-windows.msi](https://github.com/dexter187gold/sa-invoice-pro/releases/download/v6.68.0/SA-Invoice-Pro-v6.68.0-windows.msi) |
| **Setup EXE** | [SA-Invoice-Pro-v6.68.0-windows-setup.exe](https://github.com/dexter187gold/sa-invoice-pro/releases/download/v6.68.0/SA-Invoice-Pro-v6.68.0-windows-setup.exe) |
| **Portable EXE** | [SA-Invoice-Pro-v6.68.0-windows-portable.exe](https://github.com/dexter187gold/sa-invoice-pro/releases/download/v6.68.0/SA-Invoice-Pro-v6.68.0-windows-portable.exe) |

> Windows builds are not Authenticode-signed yet. SmartScreen may show a warning — choose **More info → Run anyway** for the beta.

---

## How to use the app (first 10 minutes)

### Step 1 — Company profile

1. Open the app → go to **Settings**
2. Fill in **company name**, address, VAT number (if registered)
3. Set **VAT on/off** and rate (default **15%** for South Africa)
4. Save

### Step 2 — First client

1. Open **Clients** → **Add client**
2. Name, phone (for WhatsApp), email optional
3. Save

### Step 3 — First invoice or quote

1. **Invoices** → **New** (or **Quotes** → **New**)
2. Pick client → add line items → tax applies from your VAT setting
3. Save → open PDF / share

### Step 4 — Job ticket (repair shops)

1. **Tickets** → create ticket linked to a client
2. Track status, notes, and convert work to an invoice when ready

### Step 5 — Backup (do this early)

1. **Settings → Backup**
2. **Download backup** (JSON) — store it on Google Drive / email yourself
3. Recovery snapshots roll automatically for recent undo

Large backups use **streaming import** so low-memory phones do not freeze.

### Step 6 — WhatsApp chase (optional)

From an invoice or ticket, use share / chase actions to open WhatsApp with a ready message (payment reminder, job ready, quote follow-up).

---

## What is included in the beta

- Clients, invoices, quotes, tickets, products, payments
- SA VAT preference (on/off + rate) on documents and PDFs
- Streaming company backup import + OPFS / file export
- Local recovery snapshots (chunked; large payloads can use OPFS)
- Licence / portal / cloud hooks for later paid plans
- Owner-oriented dashboard and command centre views

Still expanding after beta: extra Settings tabs (brand, nav, comms), deeper sync metrics, code-signed Windows.

---

## Data safety (read once)

- Data is stored **on the device** first (offline-capable)
- **Never** rely on a single device — download a JSON backup regularly
- Restore is **staged and atomic** — a failed import does not half-wipe your workspace
- Account / licence keys are kept separate from workspace restore where possible

---

## Developers

```bash
git clone https://github.com/dexter187gold/sa-invoice-pro.git
cd sa-invoice-pro
npm install
npm run dev
```

```bash
npm run build          # production web build
npm run test:unit      # unit tests
npm run test:e2e       # Playwright smoke
npm run ci:guard       # block PLACEHOLDER / empty critical files
```

Primary branch: **`main`**. Releases are tagged `v*` and published on GitHub Releases.

More docs:

- [First beta notes](docs/BETA_RELEASE.md)
- [How to use (full)](docs/USER_GUIDE.md)
- [Windows desktop](docs/WINDOWS.md)
- [Roadmap](docs/ROADMAP.md)
- [LinkedIn / marketing pack](docs/MARKETING.md)

---

## Licence & contact

Product contact: **sainvoicepro@gmail.com**  
Built for SA SMEs — workshops, technicians, and small service businesses.

© SA Invoice Pro. All rights reserved.
