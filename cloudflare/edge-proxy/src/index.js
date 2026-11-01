/** SA Invoice Pro — Cloudflare edge proxy (health + WA + PayFast + license API) */
async function proxy(req, targetBase, pathAndQuery) {
  const url = targetBase.replace(/\/$/, '') + pathAndQuery
  const headers = new Headers(req.headers)
  headers.delete('host')
  const init = { method: req.method, headers, redirect: 'follow' }
  if (req.method !== 'GET' && req.method !== 'HEAD') init.body = await req.arrayBuffer()
  const upstream = await fetch(url, init)
  const out = new Headers(upstream.headers)
  const origin = req.headers.get('Origin') || '*'
  out.set('Access-Control-Allow-Origin', origin)
  out.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
  out.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
  out.set('Vary', 'Origin')
  return new Response(upstream.body, { status: upstream.status, headers: out })
}

async function probe(url, timeoutMs = 8000) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const r = await fetch(url, { signal: ctrl.signal })
    const text = await r.text()
    let json = null
    try { json = JSON.parse(text) } catch {}
    return { ok: r.ok, status: r.status, body: json || text.slice(0, 200) }
  } catch (e) {
    return { ok: false, status: 0, error: String(e.message || e) }
  } finally {
    clearTimeout(t)
  }
}

export default {
  async fetch(req, env) {
    const syncBase = env.SYNC_ORIGIN || 'https://saip-sync.onrender.com'
    const licenseBase = env.LICENSE_ORIGIN || 'https://saip-license.onrender.com'
    const url = new URL(req.url)
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': req.headers.get('Origin') || '*',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        },
      })
    }
    if (url.pathname === '/' || url.pathname === '/health' || url.pathname === '/api/health') {
      const [sync, license] = await Promise.all([
        probe(syncBase + '/health'),
        probe(licenseBase + '/health'),
      ])
      const body = { ok: !!(sync.ok || license.ok), edge: 'saip-edge-proxy', ts: new Date().toISOString(), sync, license }
      return Response.json(body, { status: body.ok ? 200 : 503 })
    }
    if (url.pathname.startsWith('/api/whatsapp/') || url.pathname.startsWith('/api/wa/') || url.pathname.startsWith('/api/payfast/')) {
      return proxy(req, syncBase, url.pathname + url.search)
    }
    if (
      url.pathname.startsWith('/api/activate') ||
      url.pathname.startsWith('/api/license') ||
      url.pathname.startsWith('/api/handshake') ||
      url.pathname.startsWith('/api/request') ||
      url.pathname.startsWith('/api/claim') ||
      url.pathname.startsWith('/api/heartbeat') ||
      url.pathname.startsWith('/api/device-status') ||
      url.pathname.startsWith('/api/public-config') ||
      url.pathname.startsWith('/api/updates')
    ) {
      return proxy(req, licenseBase, url.pathname + url.search)
    }
    return Response.json({
      ok: true,
      service: 'saip-edge-proxy',
      routes: ['/health', '/api/whatsapp/*', '/api/wa/*', '/api/payfast/*', '/api/activate*', '/api/license/*'],
    })
  },
}
