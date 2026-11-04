(function () {
  var API = (window.SAIP_API || 'https://saip-sync.onrender.com').replace(/\/$/, '')
  var TOKEN_KEY = 'saip_client_portal_token'
  var PORTAL_TOKEN_KEY = 'saip_portal_view_token'
  var app = document.getElementById('app')
  var paystackReady = null
  var payConfig = null

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
    var res = await fetch(API + path, Object.assign({}, opts || {}, { headers: headers }))
    var j = await res.json().catch(function () { return {} })
    if (!res.ok) throw new Error(j.message || j.error || ('HTTP ' + res.status))
    return j
  }

  function loadPaystackScript() {
    if (paystackReady) return paystackReady
    paystackReady = new Promise(function (resolve, reject) {
      if (window.PaystackPop) return resolve()
      var s = document.createElement('script')
      s.src = 'https://js.paystack.co/v1/inline.js'
      s.async = true
      s.onload = function () { resolve() }
      s.onerror = function () { reject(new Error('Could not load Paystack')) }
      document.head.appendChild(s)
    })
    return paystackReady
  }

  async function fetchPayConfig() {
    if (payConfig) return payConfig
    try {
      payConfig = await api('/api/portal/pay/config')
    } catch (e) {
      try {
        payConfig = await api('/api/payments/config')
      } catch (e2) {
        payConfig = { enabled: false }
      }
    }
    return payConfig
  }

  async function startPayNow(invoice, btn) {
    var viewToken = portalViewToken() || token()
    if (!viewToken) {
      alert('Please sign in or open the portal link from your workshop first.')
      return
    }
    if (btn) {
      btn.disabled = true
      btn.textContent = 'Starting…'
    }
    try {
      await loadPaystackScript()
      var cfg = await fetchPayConfig()
      if (!cfg.enabled || !cfg.publicKey) {
        throw new Error('Online payments are not enabled for this workshop yet (test or live keys). Please pay via EFT or contact the shop.')
      }

      var init = await api('/api/portal/pay/init', {
        method: 'POST',
        body: JSON.stringify({
          token: viewToken,
          invoiceId: invoice.id || invoice.number,
          amount: invoice.balance != null ? invoice.balance : invoice.total,
          email: invoice.clientEmail || undefined,
        }),
      })

      if (!init.reference) {
        throw new Error(init.message || 'Could not start payment')
      }

      var handler = window.PaystackPop.setup({
        key: init.publicKey || cfg.publicKey,
        email: init.email,
        amount: init.amountCents,
        currency: init.currency || 'ZAR',
        ref: init.reference,
        metadata: {
          custom_fields: [
            { display_name: 'Invoice', variable_name: 'invoice', value: invoice.number || invoice.id },
          ],
        },
        callback: function (response) {
          verifyAndRefresh(response.reference, btn)
        },
        onClose: function () {
          if (btn) {
            btn.disabled = false
            btn.textContent = 'Pay Now'
          }
        },
      })
      handler.openIframe()
    } catch (e) {
      alert(e.message || 'Payment could not be started')
      if (btn) {
        btn.disabled = false
        btn.textContent = 'Pay Now'
      }
    }
  }

  async function verifyAndRefresh(reference, btn) {
    try {
      if (btn) btn.textContent = 'Confirming…'
      var v = await api('/api/portal/pay/verify', {
        method: 'POST',
        body: JSON.stringify({ reference: reference }),
      })
      if (v.ok) {
        showToast('Payment received — thank you!')
        if (token()) showApp()
        else {
          app.innerHTML =
            '<div class="shell"><div class="card login-card">' +
            '<div class="eyebrow">Payment successful</div>' +
            '<h1>Thank you</h1>' +
            '<p class="muted">Your payment has been received. The workshop has been notified.</p>' +
            '<p><strong>' + money(v.payment && v.payment.amount) + '</strong></p>' +
            '<p class="muted">Ref: ' + ((v.payment && v.payment.reference) || reference) + '</p>' +
            '</div></div>'
        }
      } else {
        alert(v.message || 'Payment could not be confirmed.')
        if (btn) {
          btn.disabled = false
          btn.textContent = 'Pay Now'
        }
      }
    } catch (e) {
      alert(e.message || 'Verification failed.')
      if (btn) {
        btn.disabled = false
        btn.textContent = 'Pay Now'
      }
    }
  }

  function showToast(msg) {
    var t = document.createElement('div')
    t.className = 'toast'
    t.textContent = msg
    document.body.appendChild(t)
    setTimeout(function () { t.classList.add('show') }, 10)
    setTimeout(function () {
      t.classList.remove('show')
      setTimeout(function () { t.remove() }, 300)
    }, 3200)
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
        body: JSON.stringify({ email: email, pin: pin }),
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
      fetchPayConfig().catch(function () {})

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
          ['overview', 'invoices', 'quotes', 'service', 'payments'].map(function (id) {
            return '<button class="tab' + (tab === id ? ' on' : '') + '" data-tab="' + id + '">' +
              id.charAt(0).toUpperCase() + id.slice(1) + '</button>'
          }).join('') +
          '</div>'

        if (tab === 'overview') {
          html +=
            '<div class="card stats">' +
            '<div class="stat"><b>' + money(sum.openBalance) + '</b><span class="muted">Open balance</span></div>' +
            '<div class="stat"><b>' + (sum.invoices || 0) + '</b><span class="muted">Invoices</span></div>' +
            '<div class="stat"><b>' + (sum.quotes || 0) + '</b><span class="muted">Quotes</span></div>' +
            '<div class="stat"><b>' + (sum.tickets || 0) + '</b><span class="muted">Service jobs</span></div>' +
            '</div>' +
            '<div class="card"><p class="muted" style="margin:0">Review invoices, accept quotes, track jobs, and pay securely online (test or live).</p></div>'
        }

        if (tab === 'invoices') {
          html += '<div class="card"><strong>Invoices</strong>'
          var inv = dash.invoices || []
          if (!inv.length) html += '<p class="muted">No invoices yet.</p>'
          inv.forEach(function (i) {
            var canPay = isUnpaid(i.status)
            html +=
              '<div class="row"><div style="flex:1"><strong>' + (i.number || i.id) + '</strong>' +
              '<div class="muted">' + dateFmt(i.date || i.issuedAt) + ' · ' + money(i.total) + '</div>' +
              (canPay
                ? '<div class="actions"><button class="btn btn-pay btn-sm" data-pay-id="' +
                  (i.id || i.number) +
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
              '<div class="muted">' + dateFmt(q.date || q.createdAt) + ' · ' + money(q.total) + '</div>' +
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
              '<div class="row"><div><strong>' + (t.title || t.subject || t.number || t.id) + '</strong>' +
              '<div class="muted">' + (t.description || '').slice(0, 120) + '</div></div>' +
              pill(t.status) + '</div>'
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
              dateFmt(p.date || p.paidAt) +
              ' · ' +
              (p.method || p.channel || p.reference || '') +
              '</div></div></div>'
          })
          html += '</div>'
        }

        html += '</div>'
        app.innerHTML = html
        document.getElementById('out').onclick = logout
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
