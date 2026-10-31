// Cloudflare Pages Function: proxy the authenticated AI endpoint to the
// existing production Worker while keeping browser requests same-origin.
export async function onRequest({ request }) {
  const target = new URL(request.url)
  target.hostname = 'sa-invoice-pro.pcrepairdex.workers.dev'
  target.protocol = 'https:'
  const headers = new Headers(request.headers)
  headers.set('Host', target.host)
  const upstream = new Request(target.toString(), request)
  return fetch(upstream)
}
