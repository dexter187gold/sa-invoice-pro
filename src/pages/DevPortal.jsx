import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { verifyDevPortalSession, loginDevPortal, logoutDevPortal, devRequest } from '../lib/devAuth'
import { loadDevConfig, saveDevConfig, resetDevConfig, DEFAULT_ENDPOINTS, RENDER_SECRET_CHECKLIST, getEndpoint } from '../lib/devConfig'
import { loadSecrets, saveSecrets, clearSecrets, SECRET_FIELDS, secretsToEnvSnippet } from '../lib/devSecrets'
import { APP_VERSION } from '../config'

const NAV = [
  { id: 'overview', label: 'Command overview', icon: '◈' },
  { id: 'releases', label: 'Releases & beta', icon: '⇧' },
  { id: 'broadcasts', label: 'User broadcasts', icon: '◉' },
  { id: 'operations', label: 'Operations', icon: '⌁' },
  { id: 'services', label: 'Services & endpoints', icon: '◎' },
  { id: 'vault', label: 'Secrets & security', icon: '▣' },
]
const severityOptions = ['info', 'success', 'warning', 'critical']
const panel = { background: 'var(--surface, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 16, padding: 18, minWidth: 0 }
const muted = { color: 'var(--muted, #64748b)', fontSize: 13 }
const field = { width: '100%', boxSizing: 'border-box' }

function DevLogin({ onOk }) {
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError('')
    try { await loginDevPortal('sainvoicepro@gmail.com', token); setToken(''); onOk() }
    catch (err) { setError(err.message || 'Sign-in failed') }
    finally { setBusy(false) }
  }
  return <div className="auth-page" style={{ minHeight: '100vh', padding: 20, display: 'grid', placeItems: 'center' }}>
    <form className="auth-card" onSubmit={submit} style={{ width: 'min(100%, 440px)', padding: 28 }}>
      <div style={{ fontSize: 12, letterSpacing: 2, color: 'var(--accent, #16a34a)', fontWeight: 800 }}>SA INVOICE PRO · PRIVATE CONSOLE</div>
      <h1 style={{ marginBottom: 6 }}>Developer Command Centre</h1>
      <p style={muted}>Owner verification opens a dedicated developer session. It is not a customer or admin account.</p>
      <label className="label">Owner email</label>
      <input className="input" style={field} value="sainvoicepro@gmail.com" readOnly />
      <label className="label" style={{ display: 'block', marginTop: 12 }}>SA owner token</label>
      <input className="input" style={field} type="password" value={token} onChange={e => setToken(e.target.value)} autoComplete="current-password" required placeholder="Enter owner token" />
      {error && <p role="alert" style={{ color: '#dc2626', fontSize: 13 }}>{error}</p>}
      <button className="btn btn-primary" style={{ width: '100%', marginTop: 16 }} disabled={busy || !token}>{busy ? 'Verifying…' : 'Unlock developer console'}</button>
      <p style={{ ...muted, marginTop: 16 }}>The raw token is never stored in this browser. Sessions expire after two hours.</p>
      <Link to="/login">Return to app sign-in</Link>
    </form>
  </div>
}

function Metric({ label, value, detail }) {
  return <div style={{ ...panel, padding: 16 }}>
    <div style={muted}>{label}</div><div style={{ fontSize: 27, fontWeight: 800, margin: '7px 0' }}>{value ?? '—'}</div>
    {detail && <div style={muted}>{detail}</div>}
  </div>
}
function SectionHead({ eyebrow, title, detail, action }) {
  return <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'end', marginBottom: 18 }}>
    <div><div style={{ ...muted, textTransform: 'uppercase', letterSpacing: 1.4, fontWeight: 800 }}>{eyebrow}</div><h2 style={{ margin: '5px 0' }}>{title}</h2>{detail && <p style={{ ...muted, margin: 0 }}>{detail}</p>}</div>
    {action}
  </div>
}

export default function DevPortal() {
  const [authed, setAuthed] = useState(false)
  const [checked, setChecked] = useState(false)
  const [section, setSection] = useState('overview')
  const [overview, setOverview] = useState(null)
  const [announcements, setAnnouncements] = useState([])
  const [releases, setReleases] = useState(null)
  const [form, setForm] = useState(() => loadDevConfig())
  const [secrets, setSecrets] = useState(() => loadSecrets())
  const [showSecrets, setShowSecrets] = useState(false)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')
  const [broadcast, setBroadcast] = useState({ title: '', body: '', severity: 'info', expiresAt: '' })
  const [releaseChannel, setReleaseChannel] = useState('beta')
  const [serviceChecks, setServiceChecks] = useState([])

  const notify = (message) => { setToast(message); setError('') }
  const fail = (message) => { setError(message); setToast('') }

  const loadOverview = useCallback(async () => {
    const [o, a] = await Promise.all([devRequest('/api/dev/overview'), devRequest('/api/dev/announcements')])
    setOverview(o.overview); setAnnouncements(a.announcements || [])
  }, [])
  useEffect(() => {
    let alive = true
    verifyDevPortalSession().then(ok => { if (alive) { setAuthed(ok); setChecked(true) } })
    return () => { alive = false }
  }, [])
  useEffect(() => {
    if (!authed) return
    loadOverview().catch(e => fail(e.message))
  }, [authed, loadOverview])

  async function refreshAll() {
    setBusy(true)
    try {
      await loadOverview()
      if (section === 'releases') await loadReleases()
      notify('Command Centre refreshed')
    } catch (e) { fail(e.message) }
    finally { setBusy(false) }
  }
  async function loadReleases() {
    const data = await devRequest('/api/dev/releases')
    setReleases(data)
  }
  async function dispatchRelease() {
    if (!window.confirm(`Dispatch the ${releaseChannel.toUpperCase()} release workflow from main?`)) return
    setBusy(true)
    try {
      const data = await devRequest('/api/dev/releases/dispatch', { method: 'POST', body: JSON.stringify({ channel: releaseChannel }) })
      notify(data.message || 'Release workflow dispatched')
      await loadOverview()
      await loadReleases().catch(() => {})
    } catch (e) { fail(e.message) }
    finally { setBusy(false) }
  }
  async function createBroadcast(e) {
    e.preventDefault()
    if (!window.confirm('Publish this alert to all app users? It will appear in their in-app notification bell.')) return
    setBusy(true)
    try {
      const data = await devRequest('/api/dev/announcements', { method: 'POST', body: JSON.stringify({ ...broadcast, expiresAt: broadcast.expiresAt || null }) })
      setAnnouncements(prev => [data.announcement, ...prev])
      setBroadcast({ title: '', body: '', severity: 'info', expiresAt: '' })
      notify(`Broadcast published. Estimated accounts: ${data.deliveredTo ?? 'all'}.`)
      await loadOverview()
    } catch (e) { fail(e.message) }
    finally { setBusy(false) }
  }
  async function toggleBroadcast(item) {
    try {
      const data = await devRequest('/api/dev/announcements/' + item.id, { method: 'PATCH', body: JSON.stringify({ active: !item.active }) })
      setAnnouncements(prev => prev.map(a => a.id === item.id ? data.announcement : a))
      notify(data.announcement.active ? 'Broadcast reactivated' : 'Broadcast withdrawn')
    } catch (e) { fail(e.message) }
  }
  async function deleteBroadcast(item) {
    if (!window.confirm('Permanently delete this broadcast?')) return
    try {
      await devRequest('/api/dev/announcements/' + item.id, { method: 'DELETE' })
      setAnnouncements(prev => prev.filter(a => a.id !== item.id)); notify('Broadcast deleted')
    } catch (e) { fail(e.message) }
  }
  async function checkServices() {
    setBusy(true)
    const checks = [
      { name: 'Sync API', url: 'https://saip-sync.onrender.com/health' },
      { name: 'Production app', url: 'https://sa-invoice-pro.pcrepairdex.workers.dev' },
      { name: 'Licence server', url: 'https://saip-license.onrender.com' },
    ]
    const results = await Promise.all(checks.map(async x => {
      const started = Date.now()
      try { const r = await fetch(x.url, { cache: 'no-store', signal: AbortSignal.timeout(12000) }); return { ...x, ok: r.ok, status: r.status, ms: Date.now() - started } }
      catch (e) { return { ...x, ok: false, error: e.message, ms: Date.now() - started } }
    }))
    setServiceChecks(results); setBusy(false); notify('Service checks complete')
  }
  function saveUrls(e) {
    e.preventDefault()
    try { setForm(saveDevConfig(form)); notify('Endpoint settings saved on this device') } catch (e) { fail(e.message) }
  }
  function saveVault(e) {
    e.preventDefault()
    try { setSecrets(saveSecrets(secrets)); notify('Local secrets reference vault saved') } catch (e) { fail(e.message) }
  }
  async function copyEnv() {
    const snippet = secretsToEnvSnippet(secrets)
    if (!snippet) return notify('No values to copy')
    try { await navigator.clipboard.writeText(snippet); notify('Environment snippet copied. Add secrets only to the relevant hosting service.') }
    catch { fail('Clipboard access unavailable') }
  }
  function lock() { logoutDevPortal(); setAuthed(false); setChecked(true); setSection('overview') }

  const groupedSecrets = useMemo(() => SECRET_FIELDS.reduce((acc, f) => { (acc[f.group] ||= []).push(f); return acc }, {}), [])
  if (!checked) return <div className="auth-page" style={{ padding: 28 }}>Verifying secure developer session…</div>
  if (!authed) return <DevLogin onOk={() => setAuthed(true)} />

  const nav = <nav aria-label="Developer sections" style={{ display: 'grid', gap: 6 }}>
    {NAV.map(item => <button key={item.id} className={section === item.id ? 'btn btn-primary' : 'btn btn-outline'} onClick={() => { setSection(item.id); if (item.id === 'releases') loadReleases().catch(e => fail(e.message)) }} style={{ textAlign: 'left', justifyContent: 'flex-start', whiteSpace: 'normal' }}>{item.icon}　{item.label}</button>)}
  </nav>

  return <div style={{ minHeight: '100vh', padding: 'clamp(12px, 2vw, 28px)', background: 'var(--bg, transparent)' }}>
    <header style={{ ...panel, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 18, background: 'linear-gradient(120deg, #102b22, #164e3b)', color: '#fff', border: 0 }}>
      <div><div style={{ fontSize: 11, letterSpacing: 2, opacity: .75, fontWeight: 800 }}>SA INVOICE PRO · ENGINEERING</div><h1 style={{ margin: '5px 0', fontSize: 'clamp(23px, 4vw, 34px)' }}>Developer Command Centre</h1><div style={{ fontSize: 13, opacity: .8 }}>Owner workspace · v{APP_VERSION} · secure developer session</div></div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn" onClick={refreshAll} disabled={busy} style={{ background: '#ffffff18', color: '#fff', borderColor: '#ffffff55' }}>{busy ? 'Working…' : '↻ Refresh'}</button>
        <button className="btn" onClick={lock} style={{ background: '#ffffff18', color: '#fff', borderColor: '#ffffff55' }}>Lock console</button>
      </div>
    </header>
    {toast && <div role="status" style={{ ...panel, marginBottom: 12, borderColor: '#16a34a' }}>{toast}</div>}
    {error && <div role="alert" style={{ ...panel, marginBottom: 12, borderColor: '#dc2626', color: '#dc2626' }}>{error}</div>}
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(190px, 245px) minmax(0, 1fr)', gap: 18, alignItems: 'start' }}>
      <aside style={{ ...panel, position: 'sticky', top: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.4, ...muted, marginBottom: 12 }}>CONTROL MODULES</div>{nav}
        <div style={{ borderTop: '1px solid var(--border)', marginTop: 16, paddingTop: 14, display: 'grid', gap: 8 }}>
          <a href="https://github.com/dexter187gold/sa-invoice-pro" target="_blank" rel="noreferrer">App source ↗</a>
          <a href="https://github.com/dexter187gold/saip-sync" target="_blank" rel="noreferrer">Sync server source ↗</a>
          <a href="https://dashboard.render.com/web/srv-db5k07vlk1mc73a9dtb0" target="_blank" rel="noreferrer">Render service ↗</a>
          <a href="https://sa-invoice-pro.pcrepairdex.workers.dev" target="_blank" rel="noreferrer">Production app ↗</a>
          <Link to="/">Desk home</Link>
        </div>
      </aside>
      <main style={{ minWidth: 0 }}>
        {section === 'overview' && <section>
          <SectionHead eyebrow="Live system snapshot" title="Command overview" detail="A single operational view of users, releases, announcements and core services." action={<button className="btn btn-outline" onClick={checkServices} disabled={busy}>Run service checks</button>} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 12, marginBottom: 16 }}>
            <Metric label="Registered accounts" value={overview?.users} detail="Cloud account records" />
            <Metric label="Active broadcasts" value={overview?.announcements} detail="Visible to app users" />
            <Metric label="Release automation" value={overview?.githubConfigured ? 'Connected' : 'Setup required'} detail={overview?.githubConfigured ? 'GitHub API ready' : 'Needs Render secret'} />
            <Metric label="App version" value={APP_VERSION} detail="Current frontend build" />
          </div>
          <div style={{ ...panel, marginBottom: 16 }}>
            <h3 style={{ marginTop: 0 }}>Release pipeline</h3>
            {overview?.release?.latest ? <p style={muted}>Latest release: <strong>{overview.release.latest.tag_name}</strong> · {overview.release.latest.prerelease ? 'Beta / pre-release' : 'Stable'} · <a href={overview.release.latest.html_url} target="_blank" rel="noreferrer">Open release ↗</a></p> : <p style={muted}>No release details available yet. Connect GitHub release automation to enable live release actions.</p>}
            {overview?.release?.workflow && <p style={muted}>Last workflow: {overview.release.workflow.status} / {overview.release.workflow.conclusion || 'running'} · <a href={overview.release.workflow.html_url} target="_blank" rel="noreferrer">View run ↗</a></p>}
            {!overview?.githubConfigured && <p style={{ color: '#b45309', fontSize: 13 }}>Add <code>SAIP_GITHUB_TOKEN</code> to the Render <strong>saip-sync</strong> environment to activate release dispatch and history. Use a narrowly scoped GitHub token with Actions read/write and Contents read/write access.</p>}
          </div>
          {serviceChecks.length > 0 && <div style={{ ...panel, marginBottom: 16 }}><h3 style={{ marginTop: 0 }}>Service check results</h3>{serviceChecks.map(s => <div key={s.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', gap: 8 }}><span>{s.name}</span><strong style={{ color: s.ok ? '#16a34a' : '#dc2626' }}>{s.ok ? 'Online' : 'Issue'} · {s.status || s.error} · {s.ms}ms</strong></div>)}</div>}
          <div style={panel}><h3 style={{ marginTop: 0 }}>Core services</h3>{(overview?.services || []).map(s => <p key={s.name} style={{ margin: '8px 0' }}><strong>{s.name}</strong> · <a href={s.url} target="_blank" rel="noreferrer">{s.url} ↗</a></p>)}</div>
        </section>}

        {section === 'releases' && <section>
          <SectionHead eyebrow="Delivery management" title="Releases & beta channel" detail="Dispatch the existing GitHub release workflow and inspect its recent results." />
          <div style={{ ...panel, marginBottom: 16 }}>
            <h3 style={{ marginTop: 0 }}>Create a release</h3>
            <p style={muted}>The workflow runs from the main branch. Stable releases are normal releases; beta releases are marked as pre-releases so testers can distinguish them.</p>
            <label className="label">Release channel</label>
            <select className="input" style={{ ...field, maxWidth: 320 }} value={releaseChannel} onChange={e => setReleaseChannel(e.target.value)}><option value="beta">Beta / pre-release</option><option value="stable">Stable release</option></select>
            <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={dispatchRelease} disabled={busy || !overview?.githubConfigured}>Dispatch {releaseChannel} release</button>
            {!overview?.githubConfigured && <p style={{ ...muted, color: '#b45309' }}>Release actions are safely disabled until SAIP_GITHUB_TOKEN is configured on Render.</p>}
          </div>
          <div style={panel}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}><h3 style={{ margin: 0 }}>Release history</h3><button className="btn btn-outline btn-sm" onClick={() => loadReleases().catch(e => fail(e.message))}>Load history</button></div>
            {releases?.releases?.length ? releases.releases.map(r => <div key={r.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}><strong>{r.tag_name}</strong> · {r.prerelease ? 'Beta' : 'Stable'} · {r.published_at ? new Date(r.published_at).toLocaleString() : 'Draft'}<div style={muted}><a href={r.html_url} target="_blank" rel="noreferrer">View release ↗</a></div></div>) : <p style={muted}>Load history to see published releases and workflow runs.</p>}
            {releases?.runs?.map(run => <div key={run.id} style={{ padding: '9px 0', borderBottom: '1px solid var(--border)' }}>Workflow #{run.run_number} · {run.status} · {run.conclusion || 'in progress'} · <a href={run.html_url} target="_blank" rel="noreferrer">Open ↗</a></div>)}
          </div>
        </section>}

        {section === 'broadcasts' && <section>
          <SectionHead eyebrow="Customer communications" title="Broadcast centre" detail="Publish in-app alerts to every registered app account. Users see them in their notification bell." />
          <div style={{ ...panel, marginBottom: 16 }}>
            <form onSubmit={createBroadcast} style={{ display: 'grid', gap: 12 }}>
              <h3 style={{ margin: 0 }}>Compose global alert</h3>
              <label className="label">Alert title<input className="input" style={field} maxLength={120} required value={broadcast.title} onChange={e => setBroadcast({ ...broadcast, title: e.target.value })} placeholder="e.g. Scheduled maintenance" /></label>
              <label className="label">Message<textarea className="input" style={field} rows={4} maxLength={3000} required value={broadcast.body} onChange={e => setBroadcast({ ...broadcast, body: e.target.value })} placeholder="Explain what users need to know…" /></label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                <label className="label">Alert type<select className="input" style={field} value={broadcast.severity} onChange={e => setBroadcast({ ...broadcast, severity: e.target.value })}>{severityOptions.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}</select></label>
                <label className="label">Optional expiry<input className="input" style={field} type="datetime-local" value={broadcast.expiresAt} onChange={e => setBroadcast({ ...broadcast, expiresAt: e.target.value })} /></label>
              </div>
              <p style={muted}>Audience is all registered app users. Broadcasts are saved on the sync server and appear in the in-app notification centre (not native OS push notifications yet).</p>
              <div><button className="btn btn-primary" disabled={busy}>Publish to all app users</button></div>
            </form>
          </div>
          <div style={panel}>
            <h3 style={{ marginTop: 0 }}>Broadcast history ({announcements.length})</h3>
            {!announcements.length && <p style={muted}>No broadcasts published yet.</p>}
            {announcements.map(a => <article key={a.id} style={{ padding: '13px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}><strong>{a.title}</strong><span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>{a.severity} · {a.active === false ? 'withdrawn' : 'active'}</span></div>
              <p style={{ margin: '6px 0', whiteSpace: 'pre-wrap' }}>{a.body}</p><p style={muted}>Created {a.createdAt ? new Date(a.createdAt).toLocaleString() : '—'} · {a.readBy?.length || 0} users marked read</p>
              <div style={{ display: 'flex', gap: 8 }}><button className="btn btn-outline btn-sm" onClick={() => toggleBroadcast(a)}>{a.active === false ? 'Reactivate' : 'Withdraw'}</button><button className="btn btn-outline btn-sm" onClick={() => deleteBroadcast(a)}>Delete</button></div>
            </article>)}
          </div>
        </section>}

        {section === 'operations' && <section>
          <SectionHead eyebrow="Reliability & response" title="Operations centre" detail="Run live health checks and jump directly to production service controls." action={<button className="btn btn-primary" onClick={checkServices} disabled={busy}>Run all checks</button>} />
          <div style={panel}>
            <h3 style={{ marginTop: 0 }}>Service health</h3>
            {serviceChecks.length ? serviceChecks.map(s => <div key={s.name} style={{ padding: 12, borderBottom: '1px solid var(--border)' }}><strong>{s.name}</strong> <span style={{ color: s.ok ? '#16a34a' : '#dc2626' }}>{s.ok ? '● Healthy' : '● Unavailable'}</span><div style={muted}>{s.status || s.error} · {s.ms} ms</div></div>) : <p style={muted}>No checks run in this session.</p>}
          </div>
          <div style={{ ...panel, marginTop: 16 }}><h3 style={{ marginTop: 0 }}>Operational controls</h3><div style={{ display: 'grid', gap: 10 }}><a href="https://dashboard.render.com/web/srv-db5k07vlk1mc73a9dtb0" target="_blank" rel="noreferrer">Render · saip-sync service dashboard ↗</a><a href="https://github.com/dexter187gold/sa-invoice-pro/actions" target="_blank" rel="noreferrer">GitHub · app build and deploy workflows ↗</a><a href="https://github.com/dexter187gold/saip-sync/actions" target="_blank" rel="noreferrer">GitHub · sync server workflows ↗</a><a href="https://dash.cloudflare.com/" target="_blank" rel="noreferrer">Cloudflare dashboard ↗</a></div></div>
        </section>}

        {section === 'services' && <section>
          <SectionHead eyebrow="Environment map" title="Services & endpoints" detail="These endpoint overrides are local to this browser. They do not silently reconfigure production." />
          <form onSubmit={saveUrls} style={panel}>
            {Object.entries({ syncServer: 'Sync API', licenseServer: 'Licence server', updatesServer: 'Updates server', deskAppUrl: 'Desk app URL', clientPortalUrl: 'Client portal URL', websiteUrl: 'Marketing website' }).map(([key, label]) => <label className="label" key={key}>{label}<input className="input" style={field} value={form[key] || ''} onChange={e => setForm({ ...form, [key]: e.target.value })} placeholder={DEFAULT_ENDPOINTS[key] || 'https://…'} /></label>)}
            <label className="label">Operator notes<textarea className="input" style={field} rows={3} value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} /></label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><button className="btn btn-primary">Save local endpoints</button><button type="button" className="btn btn-outline" onClick={() => setForm(resetDevConfig())}>Reset defaults</button></div>
          </form>
        </section>}

        {section === 'vault' && <section>
          <SectionHead eyebrow="Security posture" title="Secrets & security" detail="This is a local reference vault only. Real production secrets must live in Render or GitHub secrets." />
          <div style={{ ...panel, marginBottom: 16, borderColor: '#d97706' }}><strong>Important:</strong><p style={muted}>Do not paste production credentials into GitHub commits or app settings. This browser vault is not connected to hosting providers and is not a secure production secret manager.</p></div>
          <form onSubmit={saveVault} style={panel}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}><h3 style={{ margin: 0 }}>Local secret reference</h3><button type="button" className="btn btn-outline btn-sm" onClick={() => setShowSecrets(v => !v)}>{showSecrets ? 'Hide values' : 'Show values'}</button></div>
            {Object.entries(groupedSecrets).map(([group, items]) => <div key={group}><h4>{group}</h4><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>{items.map(f => <label className="label" key={f.key}>{f.label}<input className="input" style={field} type={f.secret && !showSecrets ? 'password' : 'text'} autoComplete="off" value={secrets[f.key] || ''} onChange={e => setSecrets({ ...secrets, [f.key]: e.target.value })} /></label>)}</div></div>)}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}><button className="btn btn-primary">Save local vault</button><button type="button" className="btn btn-outline" onClick={copyEnv}>Copy env snippet</button><button type="button" className="btn btn-outline" onClick={() => { if (window.confirm('Clear local vault values?')) { clearSecrets(); setSecrets(loadSecrets()); notify('Local vault cleared') } }}>Clear local vault</button></div>
          </form>
          <div style={{ ...panel, marginTop: 16 }}><h3 style={{ marginTop: 0 }}>Hosting secret checklist</h3>{RENDER_SECRET_CHECKLIST.map(row => <p key={row.service} style={{ margin: '8px 0' }}><strong>{row.service}</strong> · {row.keys.join(', ')}</p>)}</div>
        </section>}
      </main>
    </div>
  </div>
}
