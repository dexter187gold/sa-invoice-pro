(function () {
  var API = (window.SAIP_API || 'https://saip-sync.onrender.com').replace(/\/$/, '')
  var TOKEN_KEY = 'saip_client_portal_token'
  var PORTAL_TOKEN_KEY = 'saip_portal_view_token'
  var COMPANY_KEY = 'saip_client_portal_company'
  var app = document.getElementById('app')

  function money(n) {
    var x = Number(n || 0)
    return 'R ' + x.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  function dateFmt(iso) {
    if (!iso) return '—'
    try {
      return new Date(iso).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' })
    } catch (e) {
      return String(iso).slice(0, 10)
    }
  }
  function dateTimeFmt(value) {
    if (!value) return '—'
    try {
      return new Date(value).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })
    } catch (e) { return String(value) }
  }
  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]
    })
  }
  function printPortalDocument(kind, record, company, client) {
    var win = window.open('', '_blank')
    if (!win) { alert('Please allow pop-ups to download or print this document.'); return }
    var title = kind.charAt(0).toUpperCase() + kind.slice(1)
    var ref = record.number || record.id || title
    var rows = Array.isArray(record.items) ? record.items : (Array.isArray(record.lines) ? record.lines : (Array.isArray(record.products) ? record.products : []))
    var itemRows = rows.map(function (item) {
      return '<tr><td>' + esc(item.description || item.name || item.title || 'Item') + '</td><td>' +
        esc(item.quantity || item.qty || 1) + '</td><td style="text-align:right">' +
        money(item.unitPrice || item.price || item.rate || item.amount || 0) + '</td><td style="text-align:right">' +
        money(item.total || item.lineTotal || ((Number(item.quantity || item.qty || 1) || 1) * (Number(item.unitPrice || item.price || item.rate || item.amount) || 0))) + '</td></tr>'
    }).join('')
    var html = '<!doctype html><html><head><meta charset="utf-8"><title>' + esc(title + ' ' + ref) +
      '</title><style>body{font:14px Arial,sans-serif;color:#17202a;margin:32px}header{display:flex;justify-content:space-between;border-bottom:2px solid #0f766e;padding-bottom:16px}h1{color:#0f766e;margin:0 0 6px}small{color:#566}table{width:100%;border-collapse:collapse;margin-top:24px}th,td{padding:10px;border-bottom:1px solid #ddd;text-align:left}th{background:#eef7f5}.total{text-align:right;font-size:20px;font-weight:bold;margin-top:24px}.meta{margin:22px 0;line-height:1.7}.note{white-space:pre-wrap;margin-top:18px}@media print{button{display:none}body{margin:14mm}}</style></head><body>' +
      '<header><div><h1>' + esc(company.name || 'Business') + '</h1><small>' + esc(company.address || '') + '<br>' + esc(company.email || '') + ' ' + esc(company.phone || '') + '</small></div><div style="text-align:right"><h2>' + esc(title) + '</h2><strong>' + esc(ref) + '</strong></div></header>' +
      '<div class="meta"><strong>Customer:</strong> ' + esc(client.name || client.email || '') + '<br><strong>Email:</strong> ' + esc(client.email || '') +
      '<br><strong>Date:</strong> ' + esc(dateTimeFmt(record.createdAt || record.date || record.issuedAt)) +
      (record.dueDate ? '<br><strong>Due date:</strong> ' + esc(dateFmt(record.dueDate)) : '') +
      (record.status ? '<br><strong>Status:</strong> ' + esc(record.status) : '') + '</div>' +
      (itemRows ? '<table><thead><tr><th>Description</th><th>Qty</th><th>Unit price</th><th>Total</th></tr></thead><tbody>' + itemRows + '</tbody></table>' : '') +
      '<div class="total">Total: ' + money(record.total || record.amount || record.amountDue || 0) + '</div>' +
      '<div class="note">' + esc(record.description || record.notes || record.publicNote || record.customerNote || '') + '</div>' +
      '<p style="margin-top:40px;color:#667">Generated from the SA Invoice Pro customer portal.</p><script>window.onload=function(){setTimeout(function(){window.print()},250)}<\/script></body></html>'
    win.document.open(); win.document.write(html); win.document.close()
  }
  function csvCell(value) {
    return '"' + String(value == null ? '' : value).replace(/"/g, '""') + '"'
  }
  function token() {
    try { return localStorage.getItem(TOKEN_KEY) || '' } catch (e) { return '' }
  }
  function setToken(t) {
    try {
      if (t) localStorage.setItem(TOKEN_KEY, t)
      else localStorage.removeItem(TOKEN_KEY)
    } catch (e) {}
  }
  function portalViewToken() {
    try {
      var q = new URLSearchParams(window.location.search).get('token')
      if (q) {
        localStorage.setItem(PORTAL_TOKEN_KEY, q)
        return q
      }
      return localStorage.getItem(PORTAL_TOKEN_KEY) || ''
    } catch (e) { return '' }
  }
  function pill(status) {
    var s = String(status || '').toLowerCase()
    var cls = 'pill'
    if (s.indexOf('reject') >= 0 || s.indexOf('overdue') >= 0 || s === 'cancelled') cls += ' bad'
    else if (s === 'paid' || s === 'accepted' || s === 'settled') cls += ' ok'
    else if (s.indexOf('pend') >= 0 || s === 'sent' || s === 'draft') cls += ' warn'
    return '<span class="' + cls + '">' + (status || '—') + '</span>'
  }
  function isUnpaid(status) {
    var s = String(status || '').toLowerCase()
    return ['paid', 'settled', 'closed', 'cancelled', 'canceled', 'void', 'voided'].indexOf(s) < 0
  }
  function invoicePaid(invoice, dash) {
    var keyId = String(invoice.id || '')
    var keyNumber = String(invoice.number || '')
    var linked = (dash.payments || []).filter(function (p) {
      var ref = String(p.invoiceId || p.invoice_id || p.invoiceNumber || p.invoice_number || '')
      return (keyId && ref === keyId) || (keyNumber && ref === keyNumber)
    }).reduce(function (sum, p) { return sum + (Number(p.amount) || 0) }, 0)
    return Math.max(Number(invoice.amountPaid) || 0, linked)
  }
  function invoiceDue(invoice, dash) {
    if (!isUnpaid(invoice.status)) return 0
    var calculated = Math.max(0, Number(invoice.total || invoice.amount || 0) - invoicePaid(invoice, dash))
    return invoice.amountDue == null ? calculated : Math.min(calculated, Math.max(0, Number(invoice.amountDue) || 0))
  }
  async function api(path, opts, attempt) {
    attempt = attempt || 1
    var headers = { Accept: 'application/json', 'Content-Type': 'application/json' }
    var t = token()
    if (t) headers.Authorization = 'Bearer ' + t
    var method = String((opts && opts.method) || 'GET').toUpperCase()
    var retryable = method === 'GET' || path === '/api/client-portal/login'
    var res
    try {
      res = await fetch(API + path, Object.assign({}, opts || {}, { headers: headers }))
    } catch (networkError) {
      if (retryable && attempt < 3) {
        await new Promise(function (resolve) { setTimeout(resolve, attempt * 1800) })
        return api(path, opts, attempt + 1)
      }
      throw new Error('The portal server may be waking up or your connection may be interrupted. Keep this page open and try again in a few seconds. If it continues, contact the workshop.')
    }
    var j = await res.json().catch(function () { return {} })
    if (!res.ok) {
      if (retryable && [502, 503, 504].indexOf(res.status) >= 0 && attempt < 3) {
        await new Promise(function (resolve) { setTimeout(resolve, attempt * 1800) })
        return api(path, opts, attempt + 1)
      }
      throw new Error(j.message || j.error || ('HTTP ' + res.status))
    }
    return j
  }

  async function startPayNow(invoice, btn) {
    if (!token()) {
      alert('Please sign in to pay this invoice.')
      return
    }
    if (btn) {
      btn.disabled = true
      btn.textContent = 'Preparing…'
    }
    try {
      var checkout = await api('/api/client-portal/pay/' + encodeURIComponent(invoice.id || invoice.number), {
        method: 'POST',
        body: JSON.stringify({}),
      })
      if (!checkout.configured) {
        var bank = checkout.bankDetails || {}
        var details = [
          checkout.message || 'Online payments are not configured.',
          bank.bankName ? 'Bank: ' + bank.bankName : '',
          bank.accountName ? 'Account name: ' + bank.accountName : '',
          bank.accountNumber ? 'Account number: ' + bank.accountNumber : '',
          bank.branchCode ? 'Branch code: ' + bank.branchCode : '',
          bank.accountType ? 'Account type: ' + bank.accountType : '',
          bank.reference ? 'Payment reference: ' + bank.reference : '',
        ].filter(Boolean).join('\n')
        alert(details)
        if (btn) { btn.disabled = false; btn.textContent = 'Pay Now' }
        return
      }
      if (!checkout.processUrl || !checkout.fields || !checkout.fields.signature) {
        throw new Error('The payment provider did not return a valid secure checkout form.')
      }
      var form = document.createElement('form')
      form.method = 'POST'
      form.action = checkout.processUrl
      form.style.display = 'none'
      Object.keys(checkout.fields).forEach(function (key) {
        var input = document.createElement('input')
        input.type = 'hidden'
        input.name = key
        input.value = String(checkout.fields[key])
        form.appendChild(input)
      })
      document.body.appendChild(form)
      form.submit()
    } catch (e) {
      alert(e.message || 'Payment could not be started.')
      if (btn) { btn.disabled = false; btn.textContent = 'Pay Now' }
    }
  }

  /** Professional quote decision — optional reason on decline */
  async function decideQuote(quoteId, decision, dash, paint, tabRef) {
    var note = ''
    if (decision === 'rejected' || decision === 'reject' || decision === 'decline') {
      note = window.prompt('Optional: reason for declining (sent to the workshop)', '') || ''
      note = String(note).slice(0, 500)
    }
    var body = {
      quoteId: quoteId,
      decision: decision,
      action: decision === 'accepted' || decision === 'accept' ? 'approve' : 'reject',
      note: note,
      token: portalViewToken() || token(),
    }
    try {
      try {
        await api('/api/client-portal/quote-decision', { method: 'POST', body: JSON.stringify(body) })
      } catch (e1) {
        await api('/api/portal/quote-decision', { method: 'POST', body: JSON.stringify(body) })
      }
      if (decision === 'accepted' || decision === 'accept') {
        showToast('Quote accepted — thank you')
      } else {
        showToast('Quote declined' + (note ? ' (note sent)' : ''))
      }
      var fresh = await api('/api/client-portal/dashboard')
      Object.assign(dash, fresh)
      if ((decision === 'accepted' || decision === 'accept') && (dash.invoices || []).some(function (i) { return isUnpaid(i.status) })) {
        tabRef.current = 'invoices'
      }
      paint()
      await refreshPresence()
      if (window.__saipPortalPresenceTimer) clearInterval(window.__saipPortalPresenceTimer)
      window.__saipPortalPresenceTimer = setInterval(refreshPresence, 30000)
    } catch (e) {
      alert(e.message || 'Could not save decision')
      throw e
    }
  }

  function renderLogin(err) {
    app.innerHTML =
      '<div class="shell"><div class="card login-card">' +
      '<div class="reticle" aria-hidden="true"><span></span></div>' +
      '<div class="eyebrow">' + esc((function () { try { return JSON.parse(localStorage.getItem(COMPANY_KEY) || '{}').name || 'Customer Portal' } catch (e) { return 'Customer Portal' } })()) + '</div>' +
      '<h1>Customer sign in</h1>' +
      '<p class="muted">Use the email and PIN from your workshop.</p>' +
      '<label>Username / email</label><input id="email" type="text" autocomplete="username" />' +
      '<label>PIN</label><input id="pin" type="password" inputmode="numeric" autocomplete="current-password" />' +
      '<div style="margin-top:1rem"><button class="btn" id="go" style="width:100%">Enter portal</button></div>' +
      (err ? '<p class="err">' + err + '</p>' : '') +
      '</div></div>'
    document.getElementById('pin').onkeydown = function (e) {
      if (e.key === 'Enter') doLogin()
    }
    document.getElementById('go').onclick = doLogin
    var foot = document.createElement('p')
    foot.className = 'muted center'
    foot.style.marginTop = '1.5rem'
    foot.textContent = 'Powered by SA Invoice Pro'
    app.appendChild(foot)
  }

  async function doLogin() {
    var email = (document.getElementById('email').value || '').trim()
    var pin = (document.getElementById('pin').value || '').trim()
    var btn = document.getElementById('go')
    btn.disabled = true
    try {
      var j = await api('/api/client-portal/login', {
        method: 'POST',
        body: JSON.stringify({ email: email, username: email, pin: pin }),
      })
      if (!j.token) throw new Error('No session token returned')
      setToken(j.token)
      try { if (j.company) localStorage.setItem(COMPANY_KEY, JSON.stringify(j.company)) } catch (e) {}
      await showApp()
    } catch (e) {
      renderLogin(e.message || 'Login failed')
    }
  }

  function logout() {
    if (window.__saipPortalPresenceTimer) { clearInterval(window.__saipPortalPresenceTimer); window.__saipPortalPresenceTimer = null }
    if (window.__saipPortalChatTimer) { clearInterval(window.__saipPortalChatTimer); window.__saipPortalChatTimer = null }
    setToken('')
    renderLogin()
  }

  async function showApp() {
    try {
      var dash = await api('/api/client-portal/dashboard')
      var tabRef = { current: 'overview' }
      var businessOnline = false
      var refreshPresence = async function () {
        try {
          var presence = await api('/api/client-portal/presence', { method: 'POST', body: JSON.stringify({}) })
          businessOnline = !!presence.businessOnline
          var indicator = document.getElementById('business-presence')
          if (indicator) {
            indicator.textContent = businessOnline ? '● Business online' : '● Business offline'
            indicator.style.color = businessOnline ? '#16a34a' : '#94a3b8'
          }
        } catch (e) {}
      }

      function paint() {
        var tab = tabRef.current
        var client = dash.client || {}
        var company = (dash.company && dash.company.name) || 'Your workshop'
        document.title = company + ' — Customer Portal'
        var sum = dash.summary || {}
        var html =
          '<div class="shell">' +
          '<div class="topbar">' +
          '<div><div class="brand">' + esc(company) + '<small>Customer account</small></div>' +
          '<div class="muted">Signed in as ' + esc(client.name || client.email || '') + ' · <span style="color:#16a34a">● You are online</span> · <span id="business-presence" style="color:#94a3b8">● Checking business status…</span></div></div>' +
          '<button class="btn btn-ghost btn-sm" id="out">Sign out</button>' +
          '</div>' +
          '<div class="tabs">' +
          ['overview', 'statement', 'invoices', 'quotes', 'service', 'payments', 'messages'].map(function (id) {
            return '<button class="tab' + (tab === id ? ' on' : '') + '" data-tab="' + id + '">' +
              (id === 'service' ? 'Job cards' : id.charAt(0).toUpperCase() + id.slice(1)) + '</button>'
          }).join('') +
          '</div>'

        if (tab === 'overview') {
          html +=
            '<div class="card stats">' +
            '<div class="stat"><b>' + money(sum.openBalance) + '</b><span class="muted">Outstanding</span></div>' +
            '<div class="stat"><b>' + money(sum.totalPaid) + '</b><span class="muted">Total paid</span></div>' +
            '<div class="stat"><b>' + money(sum.totalInvoiced) + '</b><span class="muted">Total invoiced</span></div>' +
            '<div class="stat"><b>' + (sum.invoices || 0) + '</b><span class="muted">Invoices</span></div>' +
            '<div class="stat"><b>' + (sum.quotes || 0) + '</b><span class="muted">Quotes</span></div>' +
            '<div class="stat"><b>' + (sum.tickets || 0) + '</b><span class="muted">Job cards</span></div>' +
            '</div>' +
            '<div class="card"><strong>Welcome to your account</strong><p class="muted" style="margin:6px 0 0">View your full account statement, invoice and quote history, job cards, and recorded payments. You can pay outstanding invoices securely when online checkout is enabled by the workshop.</p><div class="actions"><button class="btn btn-ghost btn-sm" data-refresh>Refresh account</button></div></div>'
        }

        if (tab === 'statement') {
          var statement = dash.accountStatement || {}
          var entries = Array.isArray(statement.entries) ? statement.entries : []
          html += '<div class="card"><div class="row" style="align-items:center"><div><strong>Full account statement</strong><div class="muted">Generated ' + dateTimeFmt(statement.generatedAt) + '</div></div><div class="actions"><button class="btn btn-ghost btn-sm" data-refresh>Refresh</button><button class="btn btn-ghost btn-sm" id="print-statement">Print / Save PDF</button><button class="btn btn-ghost btn-sm" id="download-statement">Download CSV</button></div></div>' +
            '<div class="stats">' +
            '<div class="stat"><b>' + money(statement.totalInvoiced) + '</b><span class="muted">Charges</span></div>' +
            '<div class="stat"><b>' + money(statement.totalPaid) + '</b><span class="muted">Payments received</span></div>' +
            '<div class="stat"><b>' + money(statement.openBalance) + '</b><span class="muted">Balance due</span></div></div>' +
            '<div style="overflow-x:auto;margin-top:12px"><table style="width:100%;border-collapse:collapse;min-width:620px"><thead><tr><th style="text-align:left;padding:9px">Date / time</th><th style="text-align:left;padding:9px">Description</th><th style="text-align:left;padding:9px">Reference</th><th style="text-align:right;padding:9px">Charge</th><th style="text-align:right;padding:9px">Payment</th><th style="text-align:right;padding:9px">Balance</th></tr></thead><tbody>' +
            (entries.length ? entries.map(function (entry) {
              return '<tr style="border-top:1px solid var(--border)"><td style="padding:9px">' + esc(dateTimeFmt(entry.date)) + '</td><td style="padding:9px">' + esc(entry.description || entry.type) + '</td><td style="padding:9px">' + esc(entry.reference || '—') + '</td><td style="padding:9px;text-align:right">' + (Number(entry.debit) ? money(entry.debit) : '—') + '</td><td style="padding:9px;text-align:right">' + (Number(entry.credit) ? money(entry.credit) : '—') + '</td><td style="padding:9px;text-align:right">' + money(entry.balance) + '</td></tr>'
            }).join('') : '<tr><td colspan="6" class="muted" style="padding:12px">No account activity recorded yet.</td></tr>') +
            '</tbody></table></div></div>'
        }

        if (tab === 'invoices') {
          html += '<div class="card"><strong>Invoices</strong>'
          var inv = dash.invoices || []
          if (!inv.length) html += '<p class="muted">No invoices yet.</p>'
          inv.forEach(function (i) {
            var canPay = isUnpaid(i.status)
            html +=
              '<div class="row"><div style="flex:1"><strong>' + (i.number || i.id) + '</strong>' +
              '<div class="muted">Issued ' + dateTimeFmt(i.createdAt || i.issuedAt || i.date) + (i.dueDate ? ' · Due date ' + esc(dateFmt(i.dueDate)) : '') + ' · Total ' + money(i.total) +
              ' · Paid ' + money(invoicePaid(i, dash)) + ' · Due ' + money(invoiceDue(i, dash)) +
              (i.paidAt || i.paidDate ? ' · Paid on ' + esc(dateTimeFmt(i.paidAt || i.paidDate)) : '') + '</div>' +
              '<div class="actions"><button class="btn btn-ghost btn-sm" data-doc-kind="invoice" data-doc-id="' + esc(i.id || i.number) + '">Print / Save as PDF</button></div>' +
              (canPay && invoiceDue(i, dash) > 0
                ? '<div class="actions"><button class="btn btn-pay btn-sm" data-pay-id="' +
                  esc(i.id || i.number) +
                  '">Pay Now</button></div>'
                : '') +
              '</div>' + pill(i.status) + '</div>'
          })
          html += '</div>'
        }

        if (tab === 'quotes') {
          html += '<div class="card"><strong>Quotes</strong><p class="muted" style="font-size:13px;margin:6px 0 0">Accept to notify the workshop. Decline can include a short reason.</p>'
          var qs = dash.quotes || []
          if (!qs.length) html += '<p class="muted">No quotes waiting.</p>'
          qs.forEach(function (q) {
            var st = String(q.status || '').toLowerCase()
            var can = st === 'sent' || st === 'draft' || !st
            html +=
              '<div class="row"><div style="flex:1"><strong>' + (q.number || q.id || 'Quote') + '</strong>' +
              '<div class="muted">Created ' + dateTimeFmt(q.createdAt || q.date) + ' · ' + money(q.total) +
              (q.portalDecisionAt || q.portalDecidedAt || q.decidedAt || q.updatedAt ? ' · Decision / update ' + esc(dateTimeFmt(q.portalDecisionAt || q.decidedAt || q.updatedAt)) : '') + '</div>' +
              '<div class="actions"><button class="btn btn-ghost btn-sm" data-doc-kind="quote" data-doc-id="' + esc(q.id || q.number) + '">Print / Save as PDF</button></div>' +
              (can
                ? '<div class="actions">' +
                  '<button class="btn btn-ok btn-sm" data-q="' + q.id + '" data-d="accepted">Accept</button>' +
                  '<button class="btn btn-bad btn-sm" data-q="' + q.id + '" data-d="rejected">Decline</button>' +
                  '</div>'
                : (q.portalNote ? '<div class="muted" style="font-size:12px;margin-top:4px">Note: ' + q.portalNote + '</div>' : '')) +
              '</div>' + pill(q.status) + '</div>'
          })
          html += '</div>'
        }

        if (tab === 'service') {
          html += '<div class="card"><strong>Job cards</strong>'
          var ts = dash.tickets || []
          if (!ts.length) html += '<p class="muted">No job cards recorded yet.</p>'
          ts.forEach(function (t) {
            html +=
              '<div class="row"><div style="flex:1"><strong>' + esc(t.number || t.title || t.subject || t.id) + '</strong>' +
              '<div class="muted">' + esc(dateTimeFmt(t.createdAt || t.openedAt || t.date)) + ' · ' + esc(t.device || t.deviceLabel || 'Service job') + (t.imei ? ' · IMEI ' + esc(t.imei) : '') + '</div>' +
              '<div>' + esc((t.description || t.publicNote || t.customerNote || '').slice(0, 220)) + '</div>' +
              (t.publicNote || t.customerNote ? '<div class="muted">Workshop note: ' + esc(t.publicNote || t.customerNote) + '</div>' : '') +
              '<div class="actions"><button class="btn btn-ghost btn-sm" data-doc-kind="job" data-doc-id="' + esc(t.id || t.number) + '">Print / Save as PDF</button></div>' +
              (t.completedAt || t.closedAt || t.updatedAt ? '<div class="muted">Last updated: ' + esc(dateTimeFmt(t.completedAt || t.closedAt || t.updatedAt)) + '</div>' : '') +
              '</div>' + pill(t.status) + '</div>'
          })
          html += '</div>'
        }

        if (tab === 'messages') {
          html += '<div class="card"><div class="row"><div><strong>Messages with the workshop</strong><div class="muted">Ask about an invoice, quote, repair or anything related to your account. Replies appear here.</div></div><button class="btn btn-ghost btn-sm" id="refresh-messages">Refresh</button></div>' +
            '<div id="chat-thread" style="max-height:420px;overflow:auto;margin:12px 0"></div>' +
            '<label for="chat-message">Your message</label><textarea id="chat-message" maxlength="4000" rows="3" style="width:100%;padding:10px;border-radius:10px;border:1px solid var(--border);background:#070b10;color:var(--text);font:inherit" placeholder="Type your question…"></textarea>' +
            '<div class="actions"><button class="btn" id="send-message">Send message</button><span class="muted">Please do not send passwords or card details.</span></div></div>'
        }

        if (tab === 'payments') {
          html += '<div class="card"><div class="row"><strong>Payments</strong><div class="actions"><button class="btn btn-ghost btn-sm" id="print-payments">Print / Save as PDF</button><button class="btn btn-ghost btn-sm" id="download-payments">Download CSV</button></div></div>'
          var ps = dash.payments || []
          if (!ps.length) {
            html += '<p class="muted">No payments recorded yet. Unpaid invoices can be paid under the Invoices tab.</p>'
          }
          ps.forEach(function (p) {
            html +=
              '<div class="row"><div><strong>' + money(p.amount) + '</strong>' +
              '<div class="muted">' +
              dateTimeFmt(p.createdAt || p.paidAt || p.date) +
              ' · ' +
              (p.method || p.channel || p.reference || '') +
              '</div></div></div>'
          })
          html += '</div>'
        }

        html += '</div>'
        app.innerHTML = html
        document.getElementById('out').onclick = logout
        app.querySelectorAll('[data-refresh]').forEach(function (el) {
          el.onclick = async function () {
            el.disabled = true
            try {
              var fresh = await api('/api/client-portal/dashboard')
              Object.assign(dash, fresh)
              paint()
              showToast('Account statement refreshed')
            } catch (e) {
              el.disabled = false
              showToast(e.message || 'Could not refresh account')
            }
          }
        })
        var printPaymentsBtn = document.getElementById('print-payments')
        if (printPaymentsBtn) printPaymentsBtn.onclick = function () { window.print() }
        var downloadPaymentsBtn = document.getElementById('download-payments')
        if (downloadPaymentsBtn) downloadPaymentsBtn.onclick = function () {
          var rows = [['Date / time', 'Amount', 'Method', 'Reference', 'Status']]
          ;(dash.payments || []).forEach(function (p) {
            rows.push([dateTimeFmt(p.createdAt || p.paidAt || p.date), p.amount, p.method || p.channel, p.reference || p.transactionId, p.status])
          })
          var blob = new Blob([rows.map(function (row) { return row.map(csvCell).join(',') }).join('\r\n')], { type: 'text/csv;charset=utf-8' })
          var url = URL.createObjectURL(blob)
          var link = document.createElement('a')
          link.href = url; link.download = 'SAIP-payment-history.csv'; link.click()
          URL.revokeObjectURL(url)
        }
        var printBtn = document.getElementById('print-statement')
        if (printBtn) printBtn.onclick = function () { window.print() }
        var downloadBtn = document.getElementById('download-statement')
        if (downloadBtn) downloadBtn.onclick = function () {
          var statement = dash.accountStatement || {}
          var rows = [['Date / time', 'Type', 'Description', 'Reference', 'Charge', 'Payment', 'Balance']]
          ;(statement.entries || []).forEach(function (entry) {
            rows.push([dateTimeFmt(entry.date), entry.type, entry.description, entry.reference, entry.debit, entry.credit, entry.balance])
          })
          var csv = rows.map(function (row) { return row.map(csvCell).join(',') }).join('\r\n')
          var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
          var url = URL.createObjectURL(blob)
          var link = document.createElement('a')
          link.href = url
          link.download = 'SAIP-account-statement.csv'
          link.click()
          URL.revokeObjectURL(url)
        }
        app.querySelectorAll('[data-doc-kind]').forEach(function (el) {
          el.onclick = function () {
            var kind = el.getAttribute('data-doc-kind')
            var id = el.getAttribute('data-doc-id')
            var source = kind === 'invoice' ? dash.invoices : kind === 'quote' ? dash.quotes : dash.tickets
            var record = (source || []).find(function (row) { return String(row.id || row.number) === String(id) })
            if (record) printPortalDocument(kind, record, dash.company || {}, dash.client || {})
          }
        })
        if (tab === 'messages') {
          var thread = document.getElementById('chat-thread')
          var renderMessages = function (messages) {
            thread.innerHTML = messages.length ? messages.map(function (m) {
              var own = m.sender === 'client'
              return '<div style="margin:8px 0;padding:10px 12px;border-radius:12px;background:' + (own ? 'rgba(20,184,166,.15)' : 'rgba(255,255,255,.06)') + ';margin-left:' + (own ? '12%' : '0') + ';margin-right:' + (own ? '0' : '12%') + '"><strong>' + esc(own ? 'You' : 'Workshop') + '</strong><div style="white-space:pre-wrap;margin-top:4px">' + esc(m.message) + '</div><div class="muted" style="font-size:11px;margin-top:5px">' + esc(dateTimeFmt(m.createdAt)) + '</div></div>'
            }).join('') : '<p class="muted">No messages yet. Send the workshop your first question.</p>'
            thread.scrollTop = thread.scrollHeight
          }
          var loadMessages = async function () {
            try { var result = await api('/api/client-portal/messages'); renderMessages(result.messages || []) }
            catch (e) { thread.innerHTML = '<p class="err">' + esc(e.message) + '</p>' }
          }
          document.getElementById('refresh-messages').onclick = loadMessages
          document.getElementById('send-message').onclick = async function () {
            var field = document.getElementById('chat-message')
            var message = String(field.value || '').trim()
            if (!message) return
            var send = document.getElementById('send-message')
            send.disabled = true
            try {
              await api('/api/client-portal/messages', { method: 'POST', body: JSON.stringify({ message: message }) })
              field.value = ''
              await loadMessages()
              showToast('Message sent to the workshop')
            } catch (e) { showToast(e.message || 'Message could not be sent') }
            finally { send.disabled = false }
          }
          loadMessages()
          if (window.__saipPortalChatTimer) clearInterval(window.__saipPortalChatTimer)
          window.__saipPortalChatTimer = setInterval(loadMessages, 15000)
        }
        app.querySelectorAll('[data-tab]').forEach(function (el) {
          el.onclick = function () {
            if (el.getAttribute('data-tab') !== 'messages' && window.__saipPortalChatTimer) { clearInterval(window.__saipPortalChatTimer); window.__saipPortalChatTimer = null }
            tabRef.current = el.getAttribute('data-tab')
            paint()
          }
        })
        app.querySelectorAll('[data-q]').forEach(function (el) {
          el.onclick = async function () {
            el.disabled = true
            try {
              await decideQuote(el.getAttribute('data-q'), el.getAttribute('data-d'), dash, paint, tabRef)
            } catch (e) {
              el.disabled = false
            }
          }
        })
        app.querySelectorAll('[data-pay-id]').forEach(function (el) {
          el.onclick = function () {
            var id = el.getAttribute('data-pay-id')
            var invoice = (dash.invoices || []).find(function (i) {
              return String(i.id) === String(id) || String(i.number) === String(id)
            })
            if (invoice) startPayNow(invoice, el)
          }
        })
      }
      paint()
      var paymentReturn = new URLSearchParams(window.location.search).get('payment')
      if (paymentReturn === 'processing') {
        showToast('Payment submitted. Waiting for secure provider confirmation. Refresh your account in a moment.')
      } else if (paymentReturn === 'cancelled') {
        showToast('Payment was cancelled. No payment confirmation was received.')
      }
    } catch (e) {
      setToken('')
      renderLogin(e.message || 'Session expired')
    }
  }

  if (token()) showApp()
  else renderLogin()
})()
