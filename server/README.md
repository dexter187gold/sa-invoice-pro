# Optional API layer (not used by Cloudflare Pages static deploy)

SA Invoice Pro’s **primary** runtime is the React SPA + IndexedDB.
This folder is a **future** Node/Express outline for `/api/v1/invoices`, `/api/v1/documents`, `/api/v1/tickets` if you later host an API.

Do **not** wire Cloudflare Pages to this folder unless you deploy a separate Worker/Node service.

```bash
cd server
npm install
npm start
# health: http://localhost:8787/api/v1/health
```

Validation uses Zod on request bodies. Data is in-memory only in this scaffold.
