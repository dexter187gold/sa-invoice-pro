import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Sync } from '../lib/sync'

/** Unified customer messages and app notifications centre. */
export default function NotificationBell() {
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [accounts, setAccounts] = useState([])
  const [selectedEmail, setSelectedEmail] = useState('')
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [threadBusy, setThreadBusy] = useState(false)
  const [pushStatus, setPushStatus] = useState({ supported: false, subscribed: false, enabled: false })
  const [pushBusy, setPushBusy] = useState(false)

  const load = useCallback(async () => {
    if (!Sync.isLoggedIn()) {
      setUnread(0); setItems([]); setAccounts([])
      return
    }
    const [notifications, portal] = await Promise.all([
      Sync.getNotifications().catch(() => ({ notifications: [], unread: 0 })),
      Sync.listClientPortalAccounts().catch(() => ({ accounts: [] })),
    ])
    setItems(notifications.notifications || [])
    setUnread(notifications.unread || 0)
    setAccounts(portal.accounts || [])
  }, [])

  useEffect(() => {
    load()
    Sync.getPushStatus().then(setPushStatus).catch(() => {})
    const timer = setInterval(load, 25000)
    return () => clearInterval(timer)
  }, [load])

  const openThread = async (email) => {
    setSelectedEmail(email)
    setThreadBusy(true)
    try {
      const data = await Sync.getClientPortalMessages(email)
      setMessages(data.messages || [])
      await load()
    } catch (e) {
      window.dispatchEvent(new CustomEvent('sa-toast', { detail: { message: e.message || 'Could not load customer messages', type: 'error' } }))
    } finally { setThreadBusy(false) }
  }

  const sendReply = async () => {
    const message = draft.trim()
    if (!selectedEmail || !message || threadBusy) return
    setThreadBusy(true)
    try {
      await Sync.replyToClientPortalMessage(selectedEmail, message)
      setDraft('')
      const data = await Sync.getClientPortalMessages(selectedEmail)
      setMessages(data.messages || [])
      await load()
      window.dispatchEvent(new CustomEvent('sa-toast', { detail: { message: 'Reply sent to customer', type: 'success' } }))
    } catch (e) {
      window.dispatchEvent(new CustomEvent('sa-toast', { detail: { message: e.message || 'Could not send reply', type: 'error' } }))
    } finally { setThreadBusy(false) }
  }

  const enablePush = async () => {
    setPushBusy(true)
    try {
      await Sync.enablePushNotifications()
      setPushStatus(await Sync.getPushStatus())
    } catch (e) {
      window.dispatchEvent(new CustomEvent('sa-toast', { detail: { message: e.message || 'Could not enable notifications', type: 'error' } }))
    } finally { setPushBusy(false) }
  }

  const disablePush = async () => {
    setPushBusy(true)
    try {
      await Sync.disablePushNotifications()
      setPushStatus(await Sync.getPushStatus())
    } catch (e) {
      window.dispatchEvent(new CustomEvent('sa-toast', { detail: { message: e.message || 'Could not disable notifications', type: 'error' } }))
    } finally { setPushBusy(false) }
  }

  const markAll = async () => {
    try { await Sync.markNotificationsRead([], true); await load() } catch {}
  }

  if (!Sync.isLoggedIn()) return null
  const unreadMessages = accounts.reduce((sum, row) => sum + (Number(row.unreadMessages) || 0), 0)
  const badgeCount = unread + unreadMessages

  return (
    <div style={{ position: 'relative' }}>
      <button type="button" className="btn btn-outline btn-sm" onClick={() => setOpen((value) => !value)}
        aria-label="Messages and notifications" title="Messages and notifications" style={{ position: 'relative' }}>
        <span aria-hidden="true">✉</span>
        {badgeCount > 0 && <span style={{ position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 999, background: '#ef4444', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>{badgeCount > 99 ? '99+' : badgeCount}</span>}
      </button>
      {open && (
        <div className="card" style={{ position: 'absolute', right: 0, top: '110%', width: 'min(390px, calc(100vw - 24px))', maxHeight: 'min(75vh, 650px)', overflow: 'auto', zIndex: 80, boxShadow: '0 12px 40px rgba(0,0,0,.25)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <strong>Messages & notifications</strong>
            <button type="button" className="btn btn-outline btn-sm" onClick={load}>Refresh</button>
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>CUSTOMER MESSAGES</div>
          {!accounts.length && <p className="muted" style={{ fontSize: 13 }}>No customer portal accounts yet.</p>}
          {accounts.map((account) => (
            <button key={account.email} type="button" onClick={() => openThread(account.email)}
              style={{ width: '100%', textAlign: 'left', padding: 9, border: '1px solid var(--border)', borderRadius: 9, marginBottom: 6, background: selectedEmail === account.email ? 'var(--surface-2, rgba(148,163,184,.12))' : 'transparent', color: 'inherit', cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <strong style={{ fontSize: 13 }}>{account.name || account.email}</strong>
                <span style={{ color: account.clientOnline ? '#16a34a' : '#94a3b8', fontSize: 11 }}>● {account.clientOnline ? 'Online' : 'Offline'}</span>
              </div>
              <div className="muted" style={{ fontSize: 11 }}>{account.email} · {account.unreadMessages || 0} unread</div>
              {account.lastMessage && <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{account.lastMessage.sender === 'client' ? 'Customer: ' : 'You: '}{String(account.lastMessage.message || '').slice(0, 90)}</div>}
            </button>
          ))}
          {selectedEmail && (
            <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 9, margin: '10px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                <strong style={{ fontSize: 13 }}>Conversation · {selectedEmail}</strong>
                <button type="button" className="btn btn-outline btn-sm" disabled={threadBusy} onClick={() => openThread(selectedEmail)}>↻</button>
              </div>
              <div style={{ maxHeight: 220, overflow: 'auto', margin: '8px 0' }}>
                {messages.length ? messages.map((message) => (
                  <div key={message.id} style={{ padding: 8, borderRadius: 8, margin: '6px 0', background: message.sender === 'business' ? 'rgba(20,184,166,.13)' : 'rgba(148,163,184,.13)' }}>
                    <strong style={{ fontSize: 11 }}>{message.sender === 'business' ? 'Your business' : 'Customer'}</strong>
                    <div style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>{message.message}</div>
                    <div className="muted" style={{ fontSize: 10 }}>{message.createdAt ? new Date(message.createdAt).toLocaleString() : ''}</div>
                  </div>
                )) : <p className="muted" style={{ fontSize: 12 }}>{threadBusy ? 'Loading conversation…' : 'No messages in this conversation yet.'}</p>}
              </div>
              <textarea className="input" rows={2} maxLength={4000} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Reply directly to this customer…" />
              <button type="button" className="btn btn-primary btn-sm" style={{ width: '100%', marginTop: 6 }} disabled={threadBusy || !draft.trim()} onClick={sendReply}>{threadBusy ? 'Working…' : 'Send reply'}</button>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, margin: '10px 0' }}>
            <Link className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center' }} to="/portal-admin" onClick={() => setOpen(false)}>Open portal administration</Link>
          </div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <strong style={{ fontSize: 13 }}>APP NOTIFICATIONS</strong>
              <button type="button" className="btn btn-outline btn-sm" onClick={markAll}>Mark all read</button>
            </div>
            {pushStatus.supported && <div style={{ padding: '8px 0', borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
              <div style={{ fontSize: 12, marginBottom: 6 }}>{pushStatus.subscribed ? 'Device alerts are enabled' : 'Get alerts when the app is closed'}</div>
              {!pushStatus.subscribed ? <button type="button" className="btn btn-primary btn-sm" disabled={pushBusy || !pushStatus.enabled} onClick={enablePush}>{pushBusy ? 'Working…' : pushStatus.enabled ? 'Enable device alerts' : 'Push setup required'}</button> : <button type="button" className="btn btn-outline btn-sm" disabled={pushBusy} onClick={disablePush}>Disable device alerts</button>}
            </div>}
            {!items.length && <p className="muted" style={{ fontSize: 12 }}>No notifications yet.</p>}
            {items.slice(0, 10).map((n) => <div key={n.id} style={{ padding: '7px 0', borderBottom: '1px solid var(--border)', opacity: n.read ? .65 : 1 }}>
              <div style={{ fontWeight: 600, fontSize: 12 }}>{n.title}</div>
              <div className="muted" style={{ fontSize: 11 }}>{n.body}</div>
            </div>)}
          </div>
        </div>
      )}
    </div>
  )
}
