# Helix + SA Invoice Pro

Helix is a separate **TanStack Start / React / Vite** app (desk tickets, client portal, channels).
It cannot be compiled into the static SA Invoice Pro PWA. Integration is by **URL**.

## 1. Deploy Helix

```bash
cd helix
npm install
# set env as required by Helix (.env / Cloudflare / Vercel)
npm run build
```

Deploy `dist` / Nitro output to **Cloudflare Pages** or **Vercel**.

Example live URL: `https://your-helix.pages.dev`

## 2. Point SA Invoice Pro at Helix

Edit `js/config.js`:

```js
helixUrl: 'https://your-helix.pages.dev',
helixPathDesk: '/desk/tickets',
helixEmbedTickets: true,
```

Or set the URL in the app after load via Settings storage (`helixUrl` in IndexedDB) using the Tickets screen once config is set.

## 3. In the app

- Open **Tickets** → Helix embeds in an iframe (if the host allows).
- **Open Helix full screen** if embed is blocked.
- **Classic tickets** keeps local SA Invoice job cards / time / sub-jobs.

## 4. Source layout in this release

```
sa-invoice-v1/          ← SA Invoice Pro PWA
helix/                  ← Helix source (companion)
```

Data is **not** shared automatically (IndexedDB vs Helix DB). Pass `company` via query string; deeper sync is a future API.
