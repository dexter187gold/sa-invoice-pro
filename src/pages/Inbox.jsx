import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import * as db from '../lib/db'
import { STORES } from '../lib/db'
import { Sync } from '../lib/sync'
import { PageFade, EmptyState } from '../components/ui'

export default function Inbox() {
  const { clients, refresh, toast } = useApp()
  const [pending, setPending] = useState([])
  const [notifs, setNotifs] = useState([])
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!Sync.isLoggedIn()) return
    try {
      const [p, n] = await Promise.all([
        Sync.getPendingWaClients(),
        Sync.getNotifications(),
      ])
      setPending(p.clients || [])
      setNotifs(n.notifications || [])
    } catch (e) {
      toast?.(e.message || 'Could not load inbox', 'error')
    }
  }, [toast])

  useEffect(() => { load() }, [load])

  const importClient = async (wa) => {
    setBusy(true)
    try {
      const phoneKey = String(wa.phone || '').replace(/\D/g, '')
      const exists = clients.find((c) => String(c.phone || '').replace(/\D/g, '') === phoneKey)
      if (exists) {
        await Sync.markWaClientImported(wa.phone, exists.id)
        toast('Already in clients — marked imported', 'info')
      } else {
        const row = await db.add(STORES.clients, {
          name: wa.name || 'WhatsApp client',
          email: wa.email || '',
          phone: wa.phone || '',
          company: wa.company || '',
          address: wa.address || '',
          category: 'walk_in',
          source: 'whatsapp',
          createdAt: new Date().toISOString(),
        })
        await Sync.markWaClientImported(wa.phone, row.id)
        await refresh()
        toast(`Imported ${wa.name || wa.phone}`, 'success')
      }
      await load()
    } catch (e) {
      toast(e.message || 'Import failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  const importAll = async () => {
    for (const wa of pending) {
      // sequential to avoid races
      // eslint-disable-next-line no-await-in-loop
      await importClient(wa)
    }
  }

  if (!Sync.isLoggedIn()) {
    return (
      <PageFade>
        <EmptyState
          title="Cloud login required"
          hint="Settings → Cloud → login so WhatsApp registrations sync here."
          action={<Link className="btn btn-primary" to="/settings">Open Settings</Link>}
        />
      </PageFade>
    )
  }

  return (
    <PageFade>
      <div className="page-header">
        <div>
          <h1>WhatsApp inbox</h1>
          <p className="subtitle">New registrations · tickets · notifications from saip-sync</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-outline" onClick={load}>Refresh</button>
          <button type="button" className="btn btn-primary" disabled={!pending.length || busy} onClick={importAll}>
            Import all pending
          </button>
          <Link className="btn btn-secondary" to="/clients">Clients</Link>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ marginTop: 0 }}>Pending client profiles ({pending.length})</h3>
        <p className="muted" style={{ fontSize: 13 }}>
          Registered on WhatsApp but not yet in your local client list. Import adds them as Walk-in.
        </p>
        {!pending.length && <p className="muted">No pending profiles — new contacts will appear here after they register.</p>}
        {pending.map((wa) => (
          <div key={wa.phone} className="list-card" style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <div>
              <strong>{wa.name || 'Unnamed'}</strong>
              <div className="muted" style={{ fontSize: 13 }}>
                {[wa.phone, wa.email, wa.company].filter(Boolean).join(' · ')}
              </div>
            </div>
            <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => importClient(wa)}>
              Import to clients
            </button>
          </div>
        ))}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Recent notifications</h3>
        {!notifs.length && <p className="muted">None yet.</p>}
        {notifs.slice(0, 20).map((n) => (
          <div key={n.id} className="list-card" style={{ opacity: n.read ? 0.7 : 1 }}>
            <strong style={{ fontSize: 14 }}>{n.title}</strong>
            <div className="muted" style={{ fontSize: 13 }}>{n.body}</div>
            <div className="muted" style={{ fontSize: 11 }}>{String(n.created_at || '').slice(0, 19).replace('T', ' ')}</div>
          </div>
        ))}
      </div>
    </PageFade>
  )
}
