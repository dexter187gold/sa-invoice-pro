/**
 * Mount live config routes for Pro Studio.
 * GET  /api/config/app     — public (browser + APK)
 * GET  /api/config/admin   — admin only (masked secrets)
 * PUT  /api/config/public  — admin only
 * PUT  /api/config/secrets — admin only
 */
import { getPublic, getAdminView, updatePublic, updateSecrets } from './config-store.js'

export function mountConfigApi(app, { requireAdmin } = {}) {
  app.get('/api/config/app', (_req, res) => {
    res.json({ ok: true, config: getPublic() })
  })

  app.get('/api/config/admin', requireAdmin || ((_r, _s, next) => next()), (_req, res) => {
    res.json({ ok: true, ...getAdminView() })
  })

  app.put('/api/config/public', requireAdmin || ((_r, _s, next) => next()), (req, res) => {
    const updated = updatePublic(req.body || {})
    res.json({ ok: true, config: updated })
  })

  app.put('/api/config/secrets', requireAdmin || ((_r, _s, next) => next()), (req, res) => {
    const view = updateSecrets(req.body || {})
    res.json({ ok: true, ...view })
  })
}
