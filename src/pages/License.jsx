import React, { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import * as licenseApi from '../lib/license'
import * as billing from '../lib/billing'
import { APP_VERSION } from '../config'
import { TIERS, purchasableTiers, normalizePlanId, getTier } from '../lib/licenseTiers'
import { PageFade, StatCard, EmptyState } from '../components/ui'
import PlanCompareTable from '../components/PlanCompareTable'

/** Support-the-product amounts (ZAR) — server plan ids tip_1 … tip_100 */
const CONTRIBUTE_AMOUNTS = [1, 10, 20, 30, 50, 100]

export default function License() {
  const { toast, online } = useApp()
  const [params] = useSearchParams()
  const [status, setStatus] = useState(null)
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [activationKey, setActivationKey] = useState('')
  const [provider, setProvider] = useState('paystack')
  const [busy, setBusy] = useState(false)
  const [returnChecking, setReturnChecking] = useState(false)
  const [billingInfo, setBillingInfo] = useState(null)
  const [serverPlans, setServerPlans] = useState([])
  const [planPrices, setPlanPrices] = useState({})
  const [refreshing, setRefreshing] = useState(false)
  const [splash, setSplash] = useState(null)
  const [contactSaved, setContactSaved] = useState(false)

  const showSuccessSplash = (detail = {}) => {
    setSplash({
      title: 'Licence activated',
      body: detail.plan
        ? `Payment confirmed. Your ${detail.plan} licence is active on this device.`
        : 'Payment confirmed. Your licence is active on this device.',
    })
  }

  const reload = async () => {
    setRefreshing(true)
    try {
      let current = await licenseApi.getLicenseStatus()
      try {
        const plans = await billing.fetchBillingPlans()
        setServerPlans(Array.isArray(plans) ? plans : [])
        setPlanPrices(Object.fromEntries((plans || []).map((plan) => [plan.id, plan.amount])))
      } catch { /* Server confirms final pricing at checkout. */ }
      const em = await billing.getLicenseEmail()
      const ph = await billing.getLicensePhone().catch(() => '')
      if (em) setEmail(em)
      if (ph) setPhone(ph)
      if (em) {
        try {
          const remote = await billing.billingStatus(em)
          setBillingInfo(remote)
          if (remote?.licensed && !current.licensed) {
            await billing.claimPaidLicense(em)
            current = await licenseApi.getLicenseStatus()
          }
        } catch (error) {
          setBillingInfo({ ok: false, error: error.message || 'Could not reach billing status service' })
        }
      }
      setStatus(current)
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    reload()
  }, [])

  useEffect(() => {
    if (params.get('paystack') !== 'return') return
    const reference = params.get('reference') || params.get('trxref') || ''
    let cancelled = false
    setReturnChecking(true)
    ;(async () => {
      try {
        const result = await billing.verifyPaystackReturn(reference, params.get('email') || email)
        if (cancelled) return
        if (result.paid) {
          await reload()
          if (!cancelled) {
            toast('Payment verified — check email/SMS for your activation key, or activate below', 'success')
            if (result.activated) showSuccessSplash({ plan: result.plan })
          }
        } else {
          toast('Payment is not confirmed yet. Your licence will activate after the gateway notifies the server.', 'warn')
        }
      } catch (e) {
        if (!cancelled) toast(e.message || String(e), 'error')
      } finally {
        if (!cancelled) setReturnChecking(false)
      }
    })()
    return () => { cancelled = true }
  }, [params])

  const ensureEmail = () => {
    const em = (email || '').trim().toLowerCase()
    if (!em.includes('@')) {
      toast('Enter a valid licence email above, then Save contact', 'warn')
      return null
    }
    return em
  }

  const saveContact = async () => {
    const em = ensureEmail()
    if (!em) return
    setBusy(true)
    try {
      await billing.saveLicenseContact(em, phone)
      setContactSaved(true)
      toast('Email & phone saved to this device and licence server', 'success')
      try {
        const remote = await billing.billingStatus(em)
        setBillingInfo(remote)
      } catch { /* optional */ }
    } catch (e) {
      toast(e.message || 'Could not save contact', 'error')
    } finally {
      setBusy(false)
    }
  }

  const buy = async (planId) => {
    const em = ensureEmail()
    if (!em) return
    setBusy(true)
    try {
      await billing.buyPlan(planId, em, provider, phone)
      // Redirect expected — if we stay on page, clear busy
      setBusy(false)
    } catch (e) {
      toast(e.message || String(e), 'error')
      setBusy(false)
    }
  }

  const contribute = async (amountZar) => {
    const em = ensureEmail()
    if (!em) return
    setBusy(true)
    try {
      // plan id tip_1, tip_10, … — licence server must map these to ZAR amounts
      await billing.buyPlan(`tip_${amountZar}`, em, provider, phone)
      setBusy(false)
    } catch (e) {
      toast(
        e.message ||
          `Contribution checkout failed. Ensure licence server has plan tip_${amountZar} (R${amountZar}).`,
        'error',
      )
      setBusy(false)
    }
  }

  const activateKey = async () => {
    const k = activationKey.trim()
    if (!k) {
      toast('Paste the activation key from your email or SMS', 'warn')
      return
    }
    setBusy(true)
    try {
      try {
        await licenseApi.handshake()
      } catch { /* offline-tolerant */ }
      const act = await licenseApi.activate(k)
      await reload()
      toast('Activation successful', 'success')
      showSuccessSplash({ plan: act?.meta?.plan || act?.plan || status?.meta?.plan })
      setActivationKey('')
    } catch (e) {
      toast(e.message || 'Activation failed — check the key and that payment completed', 'error')
    } finally {
      setBusy(false)
    }
  }

  const licensed = !!status?.licensed
  const trialLeft = status?.trialDaysLeft
  const currentPlan = normalizePlanId(billingInfo?.plan || status?.meta?.plan || status?.meta?.planId || '')

  // Merge local catalogue with live server plan list (full catalogue)
  const catalogue = TIERS.map((t) => {
    const fromServer = serverPlans.find((p) => p.id === t.id || p.code === t.code)
    const amount = fromServer?.amount ?? planPrices[t.id]
    return {
      ...t,
      serverAmount: amount != null ? Number(amount) : null,
      serverSeats: fromServer?.seats ?? t.seats,
      onServer: !!fromServer,
    }
  })

  return (
    <PageFade>
      {splash && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed', inset: 0, zIndex: 80, display: 'grid', placeItems: 'center',
            background: 'rgba(0,0,0,.55)', padding: 16,
          }}
          onClick={() => setSplash(null)}
        >
          <div
            className="card"
            style={{
              maxWidth: 420, width: '100%', textAlign: 'center', border: '2px solid var(--green,#22c55e)',
              boxShadow: '0 20px 50px rgba(0,0,0,.35)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 42, lineHeight: 1, marginBottom: 8 }}>✓</div>
            <h2 style={{ margin: '0 0 8px' }}>{splash.title}</h2>
            <p className="muted" style={{ margin: '0 0 16px' }}>{splash.body}</p>
            <p className="muted" style={{ fontSize: 12 }}>You can manage seats and upgrades on this page any time.</p>
            <button type="button" className="btn btn-primary" style={{ width: '100%', marginTop: 12 }} onClick={() => setSplash(null)}>
              Continue to desk
            </button>
          </div>
        </div>
      )}

      {returnChecking && (
        <div className="card" role="status" style={{ marginBottom: 12 }}>
          Verifying your payment securely… Please keep this page open.
        </div>
      )}

      <div className="page-header">
        <div>
          <h1>License</h1>
          <p className="subtitle">
            {online ? 'Online' : 'Offline'} · Full catalogue · Pay → key → activate · v{APP_VERSION}
          </p>
        </div>
        <button type="button" className="btn btn-outline" onClick={reload} disabled={busy || refreshing}>
          {refreshing ? 'Refreshing…' : 'Refresh status'}
        </button>
      </div>

      <div className="card form-grid" style={{ marginBottom: 16, position: 'relative', zIndex: 2 }}>
        <div>
          <label className="label" htmlFor="license-email">Licence account email</label>
          <input
            id="license-email"
            className="input"
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setContactSaved(false) }}
            placeholder="you@shop.co.za"
            autoComplete="email"
          />
        </div>
        <div>
          <label className="label" htmlFor="license-phone">Mobile (optional — SMS key delivery)</label>
          <input
            id="license-phone"
            className="input"
            type="tel"
            value={phone}
            onChange={(e) => { setPhone(e.target.value); setContactSaved(false) }}
            placeholder="082 123 4567"
            autoComplete="tel"
          />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <button type="button" className="btn btn-primary" disabled={busy} onClick={saveContact}>
            {busy ? 'Saving…' : contactSaved ? 'Contact saved' : 'Save email & phone'}
          </button>
          <p className="muted" style={{ fontSize: 12, margin: 0, flex: '1 1 200px' }}>
            Saves to this device and pushes contact to the licence server for activation keys and receipts.
          </p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16, position: 'relative', zIndex: 2 }}>
        <h3 style={{ marginTop: 0 }}>{(licensed || billingInfo?.licensed) ? 'Change or upgrade your plan' : 'Full licence catalogue'}</h3>
        <p className="muted" style={{ fontSize: 13 }}>
          Same catalogue as the website and licence portal: Trial (T), Solo (S), Shop (P), Multi-branch (M), Lifetime (L), Enterprise (E).
          Live prices load from the licence server when available.
        </p>
        <label className="label" htmlFor="license-payment-provider">Payment provider</label>
        <select
          id="license-payment-provider"
          className="input"
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          style={{ maxWidth: 320, marginBottom: 12 }}
        >
          <option value="paystack">Paystack · Cards, eligible wallets, Capitec Pay & EFT</option>
          <option value="payfast">PayFast · Cards & Instant EFT</option>
        </select>

        <div
          className="license-plan-grid"
          style={{
            display: 'grid',
            gap: 10,
            gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))',
            position: 'relative',
            zIndex: 2,
          }}
        >
          {catalogue.map((t) => {
            const isCurrent = currentPlan === t.id
            const currentIndex = TIERS.findIndex((x) => x.id === currentPlan)
            const targetIndex = TIERS.findIndex((x) => x.id === t.id)
            const canBuy = t.purchasable !== false
            const action = !canBuy
              ? (t.id === 'trial' ? 'Included free' : 'Contact owner / admin')
              : isCurrent
                ? 'Current plan'
                : currentIndex < 0 || targetIndex > currentIndex
                  ? 'Upgrade to ' + t.name
                  : 'Switch to ' + t.name
            const priceLabel =
              t.serverAmount != null
                ? 'R ' + Number(t.serverAmount).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                : t.priceHint

            return (
              <div
                key={t.id}
                style={{
                  border: isCurrent || t.recommended ? '2px solid var(--green,#22c55e)' : '1px solid var(--border,rgba(255,255,255,.12))',
                  borderRadius: 12,
                  padding: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  position: 'relative',
                  zIndex: 2,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                  <strong>{t.name}</strong>
                  <span className="badge">{t.code}{isCurrent ? ' · Active' : ''}{t.recommended && !isCurrent ? ' · Popular' : ''}</span>
                </div>
                <div className="muted" style={{ fontSize: 11 }}>
                  {priceLabel}
                  {t.serverSeats != null ? ` · ${t.serverSeats} seat${t.serverSeats === 1 ? '' : 's'}` : ''}
                  {t.onServer ? ' · live price' : ''}
                </div>
                <ul style={{ margin: '0 0 8px', paddingLeft: 16, fontSize: 12, flex: 1 }}>
                  {(t.features || []).slice(0, 5).map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                <button
                  type="button"
                  className={isCurrent || !canBuy ? 'btn btn-outline btn-sm' : 'btn btn-primary btn-sm'}
                  style={{ width: '100%', pointerEvents: 'auto', position: 'relative', zIndex: 3 }}
                  disabled={busy || isCurrent || !canBuy}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    if (!canBuy || isCurrent) return
                    buy(t.id)
                  }}
                >
                  {action}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16, borderLeft: '4px solid #f59e0b', position: 'relative', zIndex: 2 }}>
        <h3 style={{ marginTop: 0 }}>Buy us a coffee · Support development</h3>
        <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
          Optional contribution toward ongoing app development and updates. Does not change your licence plan.
          Choose an amount — you will be redirected to Paystack.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {CONTRIBUTE_AMOUNTS.map((amt) => (
            <button
              key={amt}
              type="button"
              className="btn btn-outline"
              style={{ minWidth: 88, pointerEvents: 'auto', position: 'relative', zIndex: 3 }}
              disabled={busy}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                contribute(amt)
              }}
            >
              R{amt}
            </button>
          ))}
        </div>
        <p className="muted" style={{ fontSize: 11, margin: '10px 0 0' }}>
          Server plan codes: tip_1, tip_10, tip_20, tip_30, tip_50, tip_100. Add these on the licence server if checkout returns unknown plan.
        </p>
      </div>

      <PlanCompareTable
        currentPlan={billingInfo?.plan || status?.meta?.plan || status?.meta?.planId || ''}
        includeTrial
      />

      {!licensed && !billingInfo?.licensed && (
        <div className="card" style={{ marginBottom: '1rem', borderLeft: '4px solid var(--warn, #f59e0b)' }}>
          <strong>{trialLeft != null && trialLeft <= 0 ? 'Trial ended (soft)' : 'Trial / unlicensed workspace'}</strong>
          <p className="muted" style={{ margin: '0.35rem 0 0' }}>
            Pay online → receive activation key by email{phone ? '/SMS' : ''} → enter key below. Desk stays open in soft mode until then.
          </p>
        </div>
      )}

      {(licensed || billingInfo?.licensed) && (
        <div className="card" style={{ marginBottom: '1rem', borderLeft: '4px solid var(--green, #10b981)' }}>
          <strong>Licence active</strong>
          <p className="muted" style={{ margin: '0.35rem 0 0' }}>
            Your {status?.meta?.plan || billingInfo?.plan || 'paid'} plan is active. You can change plans above at any time.
          </p>
          {billingInfo?.paidAt ? <p className="muted">Last payment: {billingInfo.paidAt}</p> : null}
        </div>
      )}
      {billingInfo && !billingInfo.licensed && billingInfo.ok === false && (
        <div className="card" role="status">
          <strong>Billing status unavailable</strong>
          <p className="muted">{billingInfo.error}</p>
        </div>
      )}

      <div className="grid-stats" style={{ marginBottom: '1rem' }}>
        <StatCard label="Status" value={(licensed || billingInfo?.licensed) ? 'Licensed' : (billingInfo?.status || 'Soft trial')} tone={(licensed || billingInfo?.licensed) ? 'good' : 'warn'} />
        <StatCard label="Trial days left" value={trialLeft ?? '—'} tone={trialLeft != null && trialLeft <= 7 ? 'bad' : undefined} />
        <StatCard label="Connectivity" value={online ? 'Online' : 'Offline'} tone={online ? 'good' : 'warn'} />
      </div>

      <div className="card" style={{ marginBottom: 16, borderLeft: '4px solid var(--green,#22c55e)', position: 'relative', zIndex: 2 }}>
        <h3 style={{ marginTop: 0 }}>Activate with key from email / SMS</h3>
        <p className="muted" style={{ fontSize: 13 }}>
          After payment, paste the key exactly as received (starts with <code>SAIP-</code>). The app checks the licence server and unlocks if payment was successful.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <input
            className="input"
            style={{ flex: '1 1 220px', fontFamily: 'ui-monospace, monospace', letterSpacing: '0.04em' }}
            value={activationKey}
            onChange={(e) => setActivationKey(e.target.value.toUpperCase())}
            placeholder="SAIP-P-XXXX-XXXX-XXXX"
            autoComplete="off"
            spellCheck={false}
          />
          <button type="button" className="btn btn-primary" disabled={busy || !activationKey.trim()} onClick={activateKey}>
            {busy ? 'Checking…' : 'Activate licence'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <Link className="btn btn-outline" to="/settings">Settings / backup</Link>
        <a className="btn btn-outline" href="https://sa-invoice.pages.dev/pricing.html" target="_blank" rel="noreferrer">Website pricing</a>
      </div>

      {!status && <EmptyState title="Loading license status…" hint="If this hangs, check network and server URL." />}
    </PageFade>
  )
}
