import React, { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'
import { PageFade } from '../components/ui'
import {
  SMS_PROVIDERS, getSmsConfig, saveSmsConfig, sendSms, getSmsLog, smsInvoiceReminder,
} from '../lib/sms'

export default function SmsGateway() {
  const { toast, invoices, clients, company } = useApp()
  const [cfg, setCfg] = useState(null)
  const [log, setLog] = useState([])
  const [testTo, setTestTo] = useState('')
  const [busy, setBusy] = useState(false)

  const reload = async () => {
    setCfg(await getSmsConfig())
    setLog(await getSmsLog())
  }
  useEffect(() => { reload() }, [])

  if (!cfg) return <PageFade><p className="muted">Loading…</p></PageFade>

  const save = async () => {
    await saveSmsConfig(cfg)
    toast('SMS settings saved', 'success')
  }

  const test = async () => {
    setBusy(true)
    try {
      await sendSms(testTo, `Test from ${company?.name || 'SA Invoice Pro'} — SMS gateway OK.`, { force: true })
      toast('SMS sent', 'success')
      await reload()
    } catch (e) {
      toast(e.message || 'Send failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  const remindFirst = async () => {
    const inv = invoices.find((i) => ['unpaid', 'overdue', 'partial'].includes(i.status))
    if (!inv) return toast('No open invoice', 'info')
    const client = clients.find((c) => String(c.id) === String(inv.clientId))
    if (!client?.phone) return toast('Client has no phone', 'error')
    setBusy(true)
    try {
      await sendSms(client.phone, smsInvoiceReminder(inv, client, company))
      toast('Reminder SMS sent', 'success')
      await reload()
    } catch (e) {
      toast(e.message || 'Failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <PageFade>
      <div className="page-header">
        <div>
          <h1>SMS gateway</h1>
          <p className="subtitle">Africa&apos;s Talking · Clickatell · proxy for CORS-safe send</p>
        </div>
        <button type="button" className="btn btn-outline" disabled={busy} onClick={remindFirst}>SMS first open invoice</button>
      </div>

      <div className="card form-grid" style={{ marginBottom: 16 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={!!cfg.enabled} onChange={(e) => setCfg({ ...cfg, enabled: e.target.checked })} />
          Enable SMS gateway
        </label>
        <div>
          <label className="label">Provider</label>
          <select className="input" value={cfg.provider} onChange={(e) => setCfg({ ...cfg, provider: e.target.value })}>
            {SMS_PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">API key</label>
          <input className="input" value={cfg.apiKey} onChange={(e) => setCfg({ ...cfg, apiKey: e.target.value })} autoComplete="off" />
        </div>
        <div>
          <label className="label">Username (Africa&apos;s Talking)</label>
          <input className="input" value={cfg.username} onChange={(e) => setCfg({ ...cfg, username: e.target.value })} />
        </div>
        <div>
          <label className="label">From / sender ID</label>
          <input className="input" value={cfg.from} onChange={(e) => setCfg({ ...cfg, from: e.target.value })} />
        </div>
        <div>
          <label className="label">Proxy URL (recommended)</label>
          <input className="input" placeholder="https://your-server/api/sms/send" value={cfg.proxyUrl} onChange={(e) => setCfg({ ...cfg, proxyUrl: e.target.value })} />
          <p className="muted" style={{ fontSize: 11, margin: '4px 0 0' }}>
            Browser CORS blocks most SMS APIs — proxy through saip-sync or your backend.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={save}>Save SMS config</button>
      </div>

      <div className="card form-grid" style={{ marginBottom: 16 }}>
        <div>
          <label className="label">Test number</label>
          <input className="input" placeholder="082…" value={testTo} onChange={(e) => setTestTo(e.target.value)} />
        </div>
        <button type="button" className="btn btn-outline" disabled={busy || !testTo} onClick={test}>Send test SMS</button>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Send log</h3>
        {!log.length ? <p className="muted">No SMS yet</p> : (
          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12 }}>
            {log.map((l, i) => (
              <li key={i}>{l.at?.slice(0, 19)} · {l.to} · {l.ok ? 'OK' : 'FAIL'} · {l.provider || l.via}</li>
            ))}
          </ul>
        )}
      </div>
    </PageFade>
  )
}
