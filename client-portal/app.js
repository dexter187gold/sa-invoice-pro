(function () {
  var API = (window.SAIP_API || 'https://saip-sync.onrender.com').replace(/\/$/, '')
  var TOKEN_KEY = 'saip_client_portal_token'
  var PORTAL_TOKEN_KEY = 'saip_portal_view_token'
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
    return ['paid', 'settled', 'closed', 'cancelled', 'void'].indexOf(s) < 0
  }
  async function api(path, opts) {
    var headers = { Accept: 'application/json', 'Content-Type': 'application/json' }
    var t = token()
    if (t) headers.Authorization = 'Bearer ' + t
    var res
    try {
      res = await fetch(API + path, Object.assign({}, opts || {}, { headers: headers }))
    } catch (networkError) {
      throw new Error('Cannot reach the SA Invoice Pro portal server. Check your internet connection and try again. If this continues, contact the workshop.')
    }
    var j = await res.json().catch(function () { return {} })
    if (!res.ok) throw new Error(j.message || j.error || ('HTTP ' + res.status))
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
    } catch (e) {
      alert(e.message || 'Could not save decision')
      throw e
    }
  }

  function renderLogin(err) {
    app.innerHTML =
      '<div class="shell"><div class="card login-card">' +
      '<div class="reticle" aria-hidden="true"><span></span></div>' +
      '<div class="eyebrow">Client portal · Sniper desk</div>' +
      '<h1>Sign in</h1>' +
      '<p class="muted">Use the email and PIN from your workshop.</p>' +
      '<label>Email</label><input id="email" type="email" autocomplete="username" />' +
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
      await showApp()
    } catch (e) {
      renderLogin(e.message || 'Login failed')
    }
  }

  function logout() {
    setToken('')
    renderLogin()
  }

  async function showApp() {
    try {
      var dash = await api('/api/client-portal/dashboard')
      var tabRef = { current: 'overview' }

      function paint() {
        var tab = tabRef.current
        var client = dash.client || {}
        var company = (dash.company && dash.company.name) || 'Your workshop'
        var sum = dash.summary || {}
        var html =
          '<div class="shell">' +
          '<div class="topbar">' +
          '<div><div class="brand">' + company + '<small>Client portal</small></div>' +
          '<div class="muted">Signed in as ' + (client.name || client.email || '') + '</div></div>' +
          '<button class="btn btn-ghost btn-sm" id="out">Sign out</button>' +
          '</div>' +
          '<div class="tabs">' +
          ['overview', 'statement', 'invoices', 'quotes', 'service', 'payments'].map(function (id) {
            return '<button class="tab' + (tab === id ? ' on' : '') + '" data-tab="' + id + '">' +
              id.charAt(0).toUpperCase() + id.slice(1) + '</button>'
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
            '<div class="card"><strong>Welcome to your account</strong><p class="muted" style="margin:6px 0 0">View your full account statement, invoice and quote history, job cards, and recorded payments. You can pay outstanding invoices securely when online checkout is enabled by the workshop.</p></div>'
        }

        if (tab === 'statement') {
          var statement = dash.accountStatement || {}
          var entries = Array.isArray(statement.entries) ? statement.entries : []
          html += '<div class="card"><div class="row" style="align-items:center"><div><strong>Full account statement</strong><div class="muted">Generated ' + dateTimeFmt(statement.generatedAt) + '</div></div><div class="actions"><button class="btn btn-ghost btn-sm" id="print-statement">Print / Save PDF</button><button class="btn btn-ghost btn-sm" id="download-statement">Download CSV</button></div></div>' +
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
              '<div class="muted">' + dateTimeFmt(i.createdAt || i.issuedAt || i.date) + ' · Total ' + money(i.total) +
              ' · Paid ' + money(i.amountPaid) + ' · Due ' + money(i.amountDue != null ? i.amountDue : Math.max(0, Number(i.total || 0) - Number(i.amountPaid || 0))) + '</div>' +
              (canPay && Number(i.amountDue != null ? i.amountDue : (Number(i.total || 0) - Number(i.amountPaid || 0))) > 0
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
              '<div class="muted">' + dateTimeFmt(q.createdAt || q.date) + ' · ' + money(q.total) + '</div>' +
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
          html += '<div class="card"><strong>Service / jobs</strong>'
          var ts = dash.tickets || []
          if (!ts.length) html += '<p class="muted">No open service jobs.</p>'
          ts.forEach(function (t) {
            html +=
              '<div class="row"><div style="flex:1"><strong>' + esc(t.number || t.title || t.subject || t.id) + '</strong>' +
              '<div class="muted">' + esc(dateTimeFmt(t.createdAt || t.openedAt || t.date)) + ' · ' + esc(t.device || t.deviceLabel || 'Service job') + (t.imei ? ' · IMEI ' + esc(t.imei) : '') + '</div>' +
              '<div>' + esc((t.description || t.publicNote || t.customerNote || '').slice(0, 220)) + '</div>' +
              (t.publicNote || t.customerNote ? '<div class="muted">Workshop note: ' + esc(t.publicNote || t.customerNote) + '</div>' : '') +
              (t.completedAt || t.closedAt || t.updatedAt ? '<div class="muted">Last updated: ' + esc(dateTimeFmt(t.completedAt || t.closedAt || t.updatedAt)) + '</div>' : '') +
              '</div>' + pill(t.status) + '</div>'
          })
          html += '</div>'
        }

        if (tab === 'payments') {
          html += '<div class="card"><strong>Payments</strong>'
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
        app.querySelectorAll('[data-tab]').forEach(function (el) {
          el.onclick = function () {
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
    } catch (e) {
      setToken('')
      renderLogin(e.message || 'Session expired')
    }
  }

  if (token()) showApp()
  else renderLogin()
})()
