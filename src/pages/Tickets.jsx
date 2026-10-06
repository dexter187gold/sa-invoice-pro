import React, { useEffect, useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import * as db from '../lib/db'
import { STORES } from '../lib/db'
import { Segmented } from '../components/ui'
import { SA_CONFIG, HELIX_ROUTES, OLIVE_REPO } from '../config'

const DESK_PATHS = [
  { id: 'tickets', path: HELIX_ROUTES.tickets, label: 'Tickets' },
  { id: 'inbox', path: HELIX_ROUTES.inbox, label: 'Inbox' },
  { id: 'clients', path: HELIX_ROUTES.clients, label: 'Clients' },
  { id: 'channels', path: HELIX_ROUTES.channels, label: 'Channels' },
  { id: 'knowledge', path: HELIX_ROUTES.knowledge, label: 'Knowledge' },
  { id: 'reports', path: HELIX_ROUTES.reports, label: 'Reports' },
  { id: 'desk', path: HELIX_ROUTES.desk, label: 'Desk home' },
  { id: 'portal', path: HELIX_ROUTES.portal, label: 'Portal' },
]

function buildHelixSrc(base, path, extra = {}) {
  const b = (base || '').trim().replace(/\/$/, '')
  if (!b) return ''
  let p = (path || HELIX_ROUTES.tickets).trim()
  if (!p.startsWith('/')) p = '/' + p
  const qs = new URLSearchParams({ source: 'sa-invoice-pro', ...extra })
  return `${b}${p}?${qs.toString()}`
}

export default function Tickets() {
  const { toast, company } = useApp()
  const [mode, setMode] = useState(() => localStorage.getItem('sa_ticket_mode') || 'classic')
  const [tickets, setTickets] = useState([])
  const [clients, setClients] = useState([])
  const [title, setTitle] = useState('')
  const [clientId, setClientId] = useState('')
  const [priority, setPriority] = useState('normal')
  const [q, setQ] = useState('')
  const [embed, setEmbed] = useState(true)
  const [helixUrl, setHelixUrl] = useState('')
  const [helixPath, setHelixPath] = useState(HELIX_ROUTES.tickets)
  const [cfgOpen, setCfgOpen] = useState(false)
  const [draftUrl, setDraftUrl] = useState('')
  const [draftPath, setDraftPath] = useState(HELIX_ROUTES.tickets)
  const [testStatus, setTestStatus] = useState(null)
  const [iframeError, setIframeError] = useState(false)

  const load = async () => {
    setTickets((await db.getAll(STORES.tickets)) || [])
    setClients((await db.getAll(STORES.clients)) || [])
    const url = (await db.getSetting('helixUrl', '')) || SA_CONFIG.helixUrl || ''
    const path = (await db.getSetting('helixPathDesk', '')) || SA_CONFIG.helixPathDesk || HELIX_ROUTES.tickets
    setHelixUrl(url)
    setHelixPath(path)
    setDraftUrl(url)
    setDraftPath(path)
  }

  useEffect(() => { load() }, [])

  const switchMode = (m) => {
    setMode(m)
    localStorage.setItem('sa_ticket_mode', m)
    setIframeError(false)
  }

  const saveHelixCfg = async () => {
    const u = draftUrl.trim().replace(/\/$/, '')
    const p = (draftPath || HELIX_ROUTES.tickets).trim() || HELIX_ROUTES.tickets
    await db.setSetting('helixUrl', u)
    await db.setSetting('helixPathDesk', p)
    setHelixUrl(u)
    setHelixPath(p)
    setCfgOpen(false)
    setIframeError(false)
    setTestStatus(null)
    toast(u ? 'Helix URL saved' : 'Helix URL cleared', 'success')
  }

  const testHelix = async () => {
    const base = (draftUrl || helixUrl || '').trim().replace(/\/$/, '')
    if (!base) {
      setTestStatus({ ok: false, msg: 'Enter a Helix base URL first' })
      return
    }
    setTestStatus({ ok: null, msg: 'Checking…' })
    try {
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), 8000)
      await fetch(base, { method: 'GET', mode: 'no-cors', signal: ctrl.signal })
      clearTimeout(t)
      setTestStatus({ ok: true, msg: 'Host reachable (open in new tab to confirm login / desk)' })
    } catch (e) {
      setTestStatus({ ok: false, msg: e.name === 'AbortError' ? 'Timed out — check URL / network' : (e.message || 'Unreachable') })
    }
  }

  const add = async (e) => {
    e.preventDefault()
    if (!title.trim()) return toast('Title required', 'error')
    await db.add(STORES.tickets, {
      title: title.trim(),
      clientId: clientId || null,
      priority,
      status: 'open',
      system: mode === 'helix' ? 'helix' : 'classic',
      date: new Date().toISOString().slice(0, 10),
    })
    setTitle('')
    toast(mode === 'helix' ? 'Helix-tagged ticket saved locally' : 'Classic ticket created', 'success')
    await load()
  }

  const list = useMemo(() => {
    return tickets
      .filter((t) => (mode === 'helix' ? t.system === 'helix' : t.system !== 'helix'))
      .filter((t) => !q || String(t.title || '').toLowerCase().includes(q.toLowerCase()))
  }, [tickets, mode, q])

  const companyQs = company?.name ? { company: company.name } : {}
  const src = buildHelixSrc(helixUrl, helixPath, companyQs)

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ margin: 0 }}>Tickets</h1>
          <p className="muted" style={{ margin: '4px 0 0' }}>
            Classic local jobs · Helix desk from{' '}
            <a href={OLIVE_REPO} target="_blank" rel="noreferrer">olive-yellow-reef-quartz</a>
          </p>
        </div>
        <Segmented
          options={[{ id: 'classic', label: 'Classic' }, { id: 'helix', label: 'Helix' }]}
          value={mode === 'helix' ? 'helix' : 'classic'}
          onChange={switchMode}
        />
      </div>

      {mode === 'helix' && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <strong>Helix desk</strong>
              <div className="muted" style={{ fontSize: 13, wordBreak: 'break-all' }}>
                {src || 'No Helix URL — configure below or Settings → Integrations'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-outline" onClick={() => setCfgOpen((v) => !v)}>
                {cfgOpen ? 'Close' : 'Configure'}
              </button>
              <button type="button" className="btn btn-outline" disabled={!src} onClick={() => window.open(src, '_blank', 'noopener')}>
                Open new tab
              </button>
              <button type="button" className="btn btn-outline" disabled={!src} onClick={() => { if (src) window.location.assign(src) }}>
                Full page
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
            {DESK_PATHS.map((r) => (
              <button
                key={r.id}
                type="button"
                className={`btn btn-sm ${helixPath === r.path ? 'btn-primary' : 'btn-outline'}`}
                onClick={async () => {
                  setHelixPath(r.path)
                  setDraftPath(r.path)
                  await db.setSetting('helixPathDesk', r.path)
                  setIframeError(false)
                }}
              >
                {r.label}
              </button>
            ))}
          </div>

          {cfgOpen && (
            <div className="form-grid" style={{ marginTop: 12 }}>
              <label className="label">Helix base URL (your deployed olive app)</label>
              <input
                className="input"
                placeholder="https://your-helix.pages.dev  or  https://your-helix.vercel.app"
                value={draftUrl}
                onChange={(e) => setDraftUrl(e.target.value)}
              />
              <label className="label">Desk path</label>
              <input
                className="input"
                placeholder="/desk/tickets"
                value={draftPath}
                onChange={(e) => setDraftPath(e.target.value)}
              />
              <p className="muted" style={{ fontSize: 12, gridColumn: '1 / -1' }}>
                1. Deploy <code>olive-yellow-reef-quartz</code> to Vercel or Cloudflare Pages.<br />
                2. Paste the live origin here (no trailing slash).<br />
                3. Default path <code>/desk/tickets</code> matches Helix file routes.
                Staff desk requires Helix login (WorkspaceGate expect=staff).
                If the iframe stays blank, the host may block framing — use <strong>Open new tab</strong>.
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-primary" onClick={saveHelixCfg}>Save</button>
                <button type="button" className="btn btn-outline" onClick={testHelix}>Test host</button>
              </div>
              {testStatus && (
                <p className="muted" style={{ color: testStatus.ok === false ? '#b91c1c' : testStatus.ok ? '#047857' : undefined }}>
                  {testStatus.msg}
                </p>
              )}
            </div>
          )}

          {!helixUrl && !cfgOpen && (
            <div className="card empty" style={{ marginTop: 12 }}>
              Helix is a <strong>separate app</strong>. Deploy olive-yellow-reef-quartz, then click <strong>Configure</strong> and paste the live URL.
              You can also set it under <strong>Settings → Integrations</strong>.
            </div>
          )}

          {helixUrl && (
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '12px 0 0' }}>
              <input type="checkbox" checked={embed} onChange={(e) => setEmbed(e.target.checked)} />
              Embed Helix in this page
            </label>
          )}

          {embed && src && (
            <div className="iframe-wrap" style={{ marginTop: 12, minHeight: 480, border: '1px solid var(--border, #e2e8f0)', borderRadius: 12, overflow: 'hidden', position: 'relative' }}>
              {iframeError && (
                <div className="card empty" style={{ position: 'absolute', inset: 0, zIndex: 1, margin: 0, borderRadius: 0 }}>
                  Embed blocked or failed to load. Use <strong>Open new tab</strong> — many hosts set X-Frame-Options.
                </div>
              )}
              <iframe
                title="Helix desk"
                src={src}
                style={{ width: '100%', height: 560, border: 0 }}
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-top-navigation-by-user-activation"
                referrerPolicy="no-referrer-when-downgrade"
                onError={() => setIframeError(true)}
                onLoad={() => setIframeError(false)}
              />
            </div>
          )}
        </div>
      )}

      <form className="card form-grid cols-3" onSubmit={add} style={{ marginBottom: '1rem' }}>
        <input className="input" placeholder={mode === 'helix' ? 'Helix subject (local mirror)' : 'Ticket title'} value={title} onChange={(e) => setTitle(e.target.value)} />
        <select className="select" value={clientId} onChange={(e) => setClientId(e.target.value)}>
          <option value="">Client (optional)</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="select" value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="low">Low</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
        <button className="btn btn-primary" type="submit">Add {mode === 'helix' ? 'Helix' : 'classic'} ticket</button>
        <input className="input" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
      </form>

      {list.map((t) => {
        const c = clients.find((x) => String(x.id) === String(t.clientId))
        return (
          <div key={t.id} className="list-card">
            <strong>{t.title}</strong>
            <div className="muted" style={{ fontSize: 13 }}>
              <span className="badge">{t.status || 'open'}</span>
              <span className="badge warn" style={{ marginLeft: 6 }}>{t.priority || 'normal'}</span>
              {c ? ` · ${c.name}` : ''} · {t.system || 'classic'}
            </div>
          </div>
        )
      })}
      {!list.length && <div className="card empty">No {mode} tickets yet.</div>}
    </div>
  )
}
