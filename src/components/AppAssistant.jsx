import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppAssistant } from '../hooks/useAppAssistant'
import { useApp } from '../context/AppContext'
import { formatMoney } from '../lib/money'
import Sync from '../lib/sync'

function mdLite(text) {
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g)
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) {
      return <strong key={i}>{p.slice(2, -2)}</strong>
    }
    return <span key={i}>{p}</span>
  })
}

function buildReply(q, ctx) {
  const s = String(q || '').trim().toLowerCase()
  const { invoices = [], clients = [], tickets = [], company, pathname, searchFaq, hints } = ctx
  if (!s) return 'Ask me about invoices, clients, payments, sync, or how to use a screen.'

  const unpaid = invoices.filter((i) => ['unpaid', 'partial', 'overdue'].includes(i.status || 'unpaid'))
  const overdue = invoices.filter((i) => (i.status || '') === 'overdue')
  const openAr = unpaid.reduce((n, i) => n + (Number(i.amountDue ?? i.total) || 0), 0)

  if (/hello|hi\b|hey\b|help/.test(s)) {
    return `Hi${company?.name ? ` — ${company.name}` : ''}. You have **${clients.length}** clients, **${invoices.length}** invoices (${unpaid.length} open), **${tickets.length}** tickets. Try: "overdue", "how to invoice", or "sync".`
  }
  if (/overdue|late|debtor/.test(s)) {
    if (!overdue.length) return 'No invoices marked **overdue**. Check **Unpaid** in the sidebar for open balances.'
    const top = overdue.slice(0, 5).map((i) => `• ${i.number || i.id} — ${formatMoney(i.amountDue ?? i.total)}`).join('\n')
    return `**${overdue.length}** overdue invoices.\n${top}\nOpen **Invoices → Overdue** to chase.`
  }
  if (/unpaid|outstanding|balance|ar\b|money in/.test(s)) {
    return `Open AR ≈ **${formatMoney(openAr)}** across **${unpaid.length}** open invoices. Use **Money in → Unpaid / Partial / Overdue**.`
  }
  if (/sync|cloud|backup|new (phone|device)/.test(s)) {
    return 'Turn **Solo mode off** in Settings → Cloud. Sign in with the same email, then tap **Sync Now**. Auto-sync runs every 5 minutes when online.'
  }
  if (/invoice|bill|quote/.test(s)) {
    return '**Invoices → New invoice** — pick client, add lines, Save. Quotes convert when accepted. Status filters live under **Money in** in the left nav.'
  }
  if (/ticket|job card|repair/.test(s)) {
    return '**Tickets / Job cards** — create a job, set priority, log work. Link notes to an invoice number when you bill.'
  }
  if (/vat|tax/.test(s)) {
    return '**Settings → VAT** — enable and set rate (0.15 = 15%). Invoice totals recalculate automatically.'
  }
  if (/nav|sidebar|menu|theme|look|appearance|layout/.test(s)) {
    return '**Settings → Navigation** — choose sidebar style, density, and accent. Theme toggle is also in the header.'
  }
  if (/payment|eft|payfast/.test(s)) {
    return 'Log payments under **Payments**. Partial invoices stay open until balance is zero. PayFast keys live in **Settings → PayFast**.'
  }

  const faq = searchFaq(s)
  if (faq?.length) return faq[0].a
  if (hints?.length) return `On this screen:\n${hints.map((h) => `• ${h}`).join('\n')}`
  return `I am the on-device assistant (no external AI key needed). Route: **${pathname}**. Try keywords: overdue, sync, invoice, VAT, tickets.`
}

export default function AppAssistant() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [pending, setPending] = useState(false)
  const [msgs, setMsgs] = useState(() => [
    { role: 'assistant', text: 'SAIP Assistant ready. Ask about invoices, overdue balances, sync, or how to use this screen.' },
  ])
  const endRef = useRef(null)
  const nav = useNavigate()
  const { hints, searchFaq, pathname } = useAppAssistant()
  const { invoices, clients, tickets, company, toast } = useApp()

  useEffect(() => {
    const onOpen = () => setOpen(true)
    const onToggle = () => setOpen((v) => !v)
    window.addEventListener('saip-open-help', onOpen)
    window.addEventListener('saip-toggle-help', onToggle)
    return () => {
      window.removeEventListener('saip-open-help', onOpen)
      window.removeEventListener('saip-toggle-help', onToggle)
    }
  }, [])

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs, open])

  const ctx = useMemo(
    () => ({ invoices, clients, tickets, company, pathname, searchFaq, hints }),
    [invoices, clients, tickets, company, pathname, searchFaq, hints],
  )

  const send = async (text) => {
    const q = String(text || input).trim()
    if (!q || pending) return
    setInput('')
    const userMessage = { role: 'user', text: q }
    setMsgs((m) => [...m, userMessage])
    setPending(true)
    window.dispatchEvent(new CustomEvent('saip-ai-activity', { detail: true }))
    try {
      if (Sync.isLoggedIn()) {
        const result = await Sync.askAssistant([{ role: 'user', content: q }])
        setMsgs((m) => [...m, { role: 'assistant', text: result.answer || 'I could not produce an answer. Please try again.' }])
      } else {
        setMsgs((m) => [...m, { role: 'assistant', text: buildReply(q, ctx) + '\n\nSign in to your cloud account to enable Cloudflare AI. This answer was generated locally.' }])
      }
    } catch (error) {
      const fallback = buildReply(q, ctx)
      setMsgs((m) => [...m, { role: 'assistant', text: `Cloud AI is unavailable right now, so here is local help instead:\n\n${fallback}\n\nNo invoice or client records were sent with this request. ${error?.message || ''}` }])
    } finally {
      setPending(false)
      window.dispatchEvent(new CustomEvent('saip-ai-activity', { detail: false }))
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        className="app-assist-fab"
        aria-label="Open AI assistant"
        onClick={() => setOpen(true)}
        title="AI assistant"
      >
        AI
      </button>
    )
  }

  return (
    <div className="app-assist-panel app-assist-chat" role="dialog" aria-label="AI assistant">
      <div className="app-assist-head">
        <div>
          <strong>SAIP Assistant</strong>
          <div className="muted" style={{ fontSize: 12 }}>{Sync.isLoggedIn() ? 'Cloudflare AI · ' : 'Local help · '}{pathname}</div>
          <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>{Sync.isLoggedIn() ? 'Your question is sent to Cloudflare AI. Do not include sensitive client or banking details.' : 'Sign in to your cloud account for AI answers. Local help works without sign-in.'}</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setMsgs([{ role: 'assistant', text: 'Chat cleared. How can I help?' }])}>Clear</button>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setOpen(false)}>Close</button>
        </div>
      </div>
      <div className="app-assist-section" style={{ marginBottom: 8 }}>
        <div className="app-assist-chips">
          {['Overdue invoices', 'How to sync', 'Create invoice', 'VAT'].map((c) => (
            <button key={c} type="button" className="chip" onClick={() => send(c)}>{c}</button>
          ))}
        </div>
      </div>
      <div className="app-assist-messages" aria-live="polite">
        {msgs.map((m, i) => (
          <div key={i} className={`assist-bubble ${m.role}`}>{mdLite(m.text)}</div>
        ))}
        <div ref={endRef} />
      </div>
      <form
        className="app-assist-compose"
        onSubmit={(e) => {
          e.preventDefault()
          send(input)
        }}
      >
        <input
          className="input"
          placeholder="Ask anything about your books…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={pending}
          autoFocus
        />
        <button type="submit" className="btn btn-primary btn-sm" disabled={pending || !input.trim()}>{pending ? 'Thinking…' : 'Send'}</button>
      </form>
      <div className="app-assist-section" style={{ marginTop: 8 }}>
        <div className="app-assist-label">Quick open</div>
        <div className="app-assist-chips">
          {[
            ['Invoices', '/invoices'],
            ['Clients', '/clients'],
            ['Tickets', '/tickets'],
            ['Settings', '/settings'],
            ['Help & Support', '/support'],
            ['P1–P20 Roadmap', '/roadmap'],
          ].map(([label, to]) => (
            <button
              key={to}
              type="button"
              className="chip"
              onClick={() => {
                nav(to)
                toast?.(`Opened ${label}`, 'info')
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export function openHelp() {
  window.dispatchEvent(new Event('saip-open-help'))
}

export function toggleHelp() {
  window.dispatchEvent(new Event('saip-toggle-help'))
}
