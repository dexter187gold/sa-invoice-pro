import React, { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'
import { PageFade, EmptyState } from '../components/ui'
import {
  WEBHOOK_EVENTS, getWebhooks, upsertEndpoint, removeEndpoint, getWebhookLog, fireWebhook,
} from '../lib/webhooks'
import { listApiKeys, createApiKey, revokeApiKey } from '../lib/apiKeys'
import { getWhiteLabel, saveWhiteLabel } from '../lib/whiteLabel'

export default function Webhooks() {
  const { toast } = useApp()
  const [endpoints, setEndpoints] = useState([])
  const [log, setLog] = useState([])
  const [keys, setKeys] = useState([])
  const [wl, setWl] = useState(null)
  const [form, setForm] = useState({
    label: 'Make / Zapier',
    url: '',
    secret: '',
    events: ['invoice.created', 'invoice.paid', 'ticket.done'],
  })

  const reload = async () => {
    const cfg = await getWebhooks()
    setEndpoints(cfg.endpoints || [])
    setLog(await getWebhookLog())
    setKeys(await listApiKeys())
    setWl(await getWhiteLabel())
  }
  useEffect(() => { reload() }, [])

  const save = async (e) => {
    e.preventDefault()
    if (!form.url.trim().startsWith('http')) return toast('HTTPS URL required', 'error')
    await upsertEndpoint(form)
    setForm({ label: 'Make / Zapier', url: '', secret: '', events: ['invoice.created', 'invoice.paid', 'ticket.done'] })
    await reload()
    toast('Webhook saved', 'success')
  }

  const toggleEvent = (id) => {
    const set = new Set(form.events || [])
    if (set.has(id)) set.delete(id)
    else set.add(id)
    setForm({ ...form, events: [...set] })
  }

  const testFire = async () => {
    const r = await fireWebhook('invoice.created', { test: true, number: 'TEST-001' })
    await reload()
    toast(r.targets ? `Fired · ok ${r.ok} · fail ${r.fail}` : 'No enabled endpoints for this event', r.ok ? 'success' : 'info')
  }

  return (
    <PageFade>
      <div className="page-header">
        <div>
          <h1>Webhooks & integrations</h1>
          <p className="subtitle">P4 · outbound POST · API keys · white-label</p>
        </div>
        <button type="button" className="btn btn-outline" onClick={testFire}>Test fire</button>
      </div>

      <form className="card form-grid" onSubmit={save} style={{ marginBottom: 16 }}>
        <div>
          <label className="label">Label</label>
          <input className="input" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
        </div>
        <div>
          <label className="label">Endpoint URL</label>
          <input className="input" placeholder="https://hooks.zapier.com/..." value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} required />
        </div>
        <div>
          <label className="label">Shared secret (header X-SAIP-Secret)</label>
          <input className="input" value={form.secret} onChange={(e) => setForm({ ...form, secret: e.target.value })} />
        </div>
        <div>
          <label className="label">Events</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {WEBHOOK_EVENTS.map((ev) => (
              <label key={ev.id} style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                <input type="checkbox" checked={(form.events || []).includes(ev.id)} onChange={() => toggleEvent(ev.id)} />
                {ev.label}
              </label>
            ))}
          </div>
        </div>
        <button type="submit" className="btn btn-primary">Save endpoint</button>
      </form>

      {!endpoints.length ? (
        <EmptyState title="No webhooks" hint="Paste a Make, Zapier, or n8n catch URL." />
      ) : (
        <div className="card" style={{ marginBottom: 16 }}>
          {endpoints.map((ep) => (
            <div key={ep.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border,rgba(255,255,255,.08))' }}>
              <strong>{ep.label}</strong>
              <div className="muted" style={{ fontSize: 12, wordBreak: 'break-all' }}>{ep.url}</div>
              <div style={{ fontSize: 11, marginTop: 4 }}>{(ep.events || []).join(', ')}</div>
              <button type="button" className="btn btn-outline btn-sm" style={{ marginTop: 6 }} onClick={async () => { await removeEndpoint(ep.id); await reload() }}>Remove</button>
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <h3 style={{ margin: 0 }}>API keys</h3>
          <button type="button" className="btn btn-outline btn-sm" onClick={async () => {
            const k = await createApiKey('Integration')
            await reload()
            try { await navigator.clipboard.writeText(k.key) } catch {}
            toast('API key created & copied — store it safely', 'success')
          }}>Create key</button>
        </div>
        {!keys.length ? <p className="muted">No keys yet</p> : keys.map((k) => (
          <div key={k.id} style={{ fontSize: 13, marginTop: 8 }}>
            <code style={{ wordBreak: 'break-all' }}>{k.enabled ? k.key : '(revoked)'}</code>
            <div className="muted" style={{ fontSize: 11 }}>{k.label} · {k.createdAt?.slice(0, 10)}</div>
            {k.enabled ? (
              <button type="button" className="btn btn-outline btn-sm" onClick={async () => { await revokeApiKey(k.id); await reload() }}>Revoke</button>
            ) : null}
          </div>
        ))}
      </div>

      {wl && (
        <div className="card form-grid" style={{ marginBottom: 16 }}>
          <h3 style={{ marginTop: 0, gridColumn: '1 / -1' }}>White-label</h3>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={!!wl.enabled} onChange={(e) => setWl({ ...wl, enabled: e.target.checked })} />
            Enable white-label
          </label>
          <div>
            <label className="label">Brand name</label>
            <input className="input" value={wl.brandName || ''} onChange={(e) => setWl({ ...wl, brandName: e.target.value })} />
          </div>
          <div>
            <label className="label">Portal domain</label>
            <input className="input" placeholder="portal.yourshop.co.za" value={wl.portalDomain || ''} onChange={(e) => setWl({ ...wl, portalDomain: e.target.value })} />
          </div>
          <div>
            <label className="label">Support email</label>
            <input className="input" value={wl.supportEmail || ''} onChange={(e) => setWl({ ...wl, supportEmail: e.target.value })} />
          </div>
          <div>
            <label className="label">Support phone</label>
            <input className="input" value={wl.supportPhone || ''} onChange={(e) => setWl({ ...wl, supportPhone: e.target.value })} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={!!wl.hidePoweredBy} onChange={(e) => setWl({ ...wl, hidePoweredBy: e.target.checked })} />
            Hide “Powered by SA Invoice Pro”
          </label>
          <button type="button" className="btn btn-primary" onClick={async () => {
            await saveWhiteLabel(wl)
            toast('White-label saved', 'success')
          }}>Save white-label</button>
        </div>
      )}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Delivery log</h3>
        {!log.length ? <p className="muted">No deliveries yet</p> : (
          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12 }}>
            {log.map((l, i) => (
              <li key={i}>
                {l.at?.slice(0, 19)} · {l.event} · {l.ok ? 'OK' : 'FAIL'} {l.status || l.error || ''}
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageFade>
  )
}
