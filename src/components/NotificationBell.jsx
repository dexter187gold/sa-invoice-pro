import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Sync } from '../lib/sync'

/** Top-right notification bubble for WA registrations & tickets */
export default function NotificationBell() {
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])

  const load = useCallback(async () => {
    if (!Sync.isLoggedIn()) {
      setUnread(0)
      setItems([])
      return
    }
    try {
      const data = await Sync.getNotifications()
      setItems(data.notifications || [])
      setUnread(data.unread || 0)
    } catch {
      /* offline / not deployed */
    }
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 25000)
    return () => clearInterval(t)
  }, [load])

  const markAll = async () => {
    try {
      await Sync.markNotificationsRead([], true)
      await load()
    } catch {}
  }

  if (!Sync.isLoggedIn()) return null

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        className="btn btn-outline btn-sm"
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        style={{ position: 'relative' }}
      >
        🔔
        {unread > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              minWidth: 18,
              height: 18,
              borderRadius: 999,
              background: '#ef4444',
              color: '#fff',
              fontSize: 11,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
            }}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div
          className="card"
          style={{
            position: 'absolute',
            right: 0,
            top: '110%',
            width: 320,
            maxHeight: 360,
            overflow: 'auto',
            zIndex: 50,
            boxShadow: '0 12px 40px rgba(0,0,0,.2)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <strong>Notifications</strong>
            <button type="button" className="btn btn-outline btn-sm" onClick={markAll}>Mark all read</button>
          </div>
          {!items.length && <p className="muted" style={{ fontSize: 13 }}>No notifications yet.</p>}
          {items.slice(0, 12).map((n) => (
            <div
              key={n.id}
              style={{
                padding: '8px 0',
                borderBottom: '1px solid var(--border)',
                opacity: n.read ? 0.65 : 1,
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 13 }}>{n.title}</div>
              <div className="muted" style={{ fontSize: 12 }}>{n.body}</div>
            </div>
          ))}
          <Link className="btn btn-secondary btn-sm" style={{ width: '100%', marginTop: 8 }} to="/inbox" onClick={() => setOpen(false)}>
            Open WhatsApp inbox
          </Link>
        </div>
      )}
    </div>
  )
}
