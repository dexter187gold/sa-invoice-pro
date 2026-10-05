# SA Invoice Pro – Folder structure

```
sa-invoice-v1/                 ← main app root (run BAT / EXE from here)
├── index.html                 ← app shell
├── css/app.css                ← UI theme
├── js/                        ← application logic
│   ├── app.js                 ← screens, navigation, modules
│   ├── db.js                  ← IndexedDB (local backend)
│   ├── auth.js                ← login / OAuth2
│   ├── license.js             ← client license handshake
│   ├── pdf.js                 ← invoices & letters PDF
│   └── templates.js           ← business template seeds
├── profiles/                  ← **business-type packs** (not separate apps)
│   ├── agriculture.json       ← modules, labels, doc types for farming
│   ├── it-services.json
│   ├── professional.json
│   └── …                      ← one JSON per business type
├── libs/                      ← jsPDF, lucide (offline)
├── vendor-server/             ← optional copy of license server
├── license_server.py          ← **your** license server (creator)
├── launcher.py                ← desktop app server (port 8080)
├── Start-SA-Invoice.bat
└── Start-License-Server.bat
```

## Business type “separation”

- **Not** separate full programs per industry.
- Each type is a **profile pack** under `profiles/`.
- Choosing Agriculture loads `profiles/agriculture.json` → hides Tickets/SLA, renames menus, filters document templates.
- One codebase, one database, different **configuration**.

## Local “backend”

- Data lives in the browser **IndexedDB** (`SAInvoicePro_v1`).
- License server is the only optional network backend (your PC).
