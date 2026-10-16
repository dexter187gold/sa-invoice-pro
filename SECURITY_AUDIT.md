# SA Invoice Pro — Security notes (pairs with saip-sync v5.2)

## Backend (saip-sync) — fixed in 5.2.0
- Login/register rate limits
- CORS locked (no more global `*` for browser origins)
- Password policy 8+ with letter+number
- Forgot-password no longer returns reset token in API body
- Admin routes require JWT + admin role
- Security headers on all responses

## Frontend / APK habits
- Store JWT in memory or localStorage; clear on logout
- Never log tokens or passwords
- Pull live config from `GET /api/config/app` only (public keys)
- OAuth: validate Google `id_token` shape before trusting email
- PDF export stays client-side (no PII posted unless user syncs workspace)

## Admin Lab login
- URL: https://saip-sync.onrender.com/admin
- Email: `admin@sainvoice.pro`
- Password: `Admin@SAIP2026!`

## Env you should set on Render
`JWT_SECRET`, `STATUS_API_TOKEN`, `ADMIN_PASSWORD`, `CORS_ORIGINS`
