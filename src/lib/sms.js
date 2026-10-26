/** SMS gateway abstraction — proxies through saip-sync by default. */
const KEY = 'sa_sms_config'

export function loadSmsConfig() {
  try {
    const c = JSON.parse(localStorage.getItem(KEY) || '{}')
    return {
      provider: c.provider || 'africastalking',
      apiKey: c.apiKey || '',
      username: c.username || '',
      from: c.from || '',
      proxyUrl: c.proxyUrl || 'https://saip-sync.onrender.com/api/sms/send',
      enabled: !!c.enabled,
    }
  } catch {
    return {
      provider: 'africastalking',
      apiKey: '',
      username: '',
      from: '',
      proxyUrl: 'https://saip-sync.onrender.com/api/sms/send',
      enabled: false,
    }
  }
}

export function saveSmsConfig(cfg) {
  localStorage.setItem(KEY, JSON.stringify(cfg || {}))
}

export async function sendSms(to, message) {
  const c = loadSmsConfig()
  if (!c.enabled) throw new Error('SMS gateway disabled — enable in Settings / SMS')
  if (!to || !message) throw new Error('to and message required')
  const url = c.proxyUrl || 'https://saip-sync.onrender.com/api/sms/send'
  const token = localStorage.getItem('saip_token') || localStorage.getItem('sa_cloud_token') || ''
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    },
    body: JSON.stringify({
      to,
      message,
      from: c.from,
      provider: c.provider,
      apiKey: c.apiKey,
      username: c.username,
    }),
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(j.error || 'SMS send failed')
  return j
}
