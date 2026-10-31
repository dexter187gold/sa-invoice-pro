import React, { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import * as licenseApi from '../lib/license'
import * as billing from '../lib/billing'
import { APP_VERSION } from '../config'
import { TIERS } from '../lib/licenseTiers'
import { PageFade, StatCard, EmptyState } from '../components/ui'

export default function License() {
  const { toast, online } = useApp()
  const [params] = useSearchParams()
  const [status, setStatus] = useState(null)
  const [email, setEmail] = useState('')
  const [provider, setProvider] = useState('paystack')
  const [busy, setBusy] = useState(false)
  const [returnChecking, setReturnChecking] = useState(false)
  const [billingInfo, setBillingInfo] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  const reload = async () => {
    setRefreshing(true)
    try {
      let current = await licenseApi.getLicenseStatus()
      const em = await billing.getLicenseEmail()
      if (em) {
        setEmail(em)
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
          if (!cancelled) toast('Payment verified and licence activated', 'success')
        } else {
          toast('Payment is not confirmed yet. Your licence remains inactive while Paystack completes verification.', 'info')
        }
      } catch (error) {
        if (!cancelled) toast(error.message || 'Could not verify payment yet', 'error')
      } finally {
        if (!cancelled) setReturnChecking(false)
      }
    })()
    return () => { cancelled = true }
  }, [params])

  const buy = async (planId) => {
    setBusy(true)
    try {
      await billing.buyPlan(planId, email, provider)
      // page navigates to PayFast
    } catch (e) {
      toast(e.message || String(e), 'error')
      setBusy(false)
    }
  }

  const licensed = !!status?.licensed
  const trialLeft = status?.trialDaysLeft

  return (
    <PageFade>
      {returnChecking && <div className="card" role="status" style={{ marginBottom: 12 }}>Verifying your Paystack payment securely… Please keep this page open.</div>}
      <div className="page-header">
        <div>
          <h1>License</h1>
          <p className="subtitle">
            {online ? 'Online' : 'Offline'} · Pay → auto seats on email · v{APP_VERSION}
          </p>
        </div>
        <button type="button" className="btn btn-outline" onClick={reload} disabled={busy || refreshing}>{refreshing ? 'Refreshing…' : 'Refresh status'}</button>
      </div>

      <div className="card form-grid" style={{ marginBottom: 16 }}>
        <div><label className="label">Licence account email</label><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@shop.co.za" /></div>
        <p className="muted" style={{ fontSize: 12, margin: 0 }}>Use the email linked to your existing licence. Your account and business data remain in place when you change plans.</p>
      </div>
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>{(licensed || billingInfo?.licensed) ? 'Change or upgrade your plan' : 'Choose your licence plan'}</h3>
        <p className="muted" style={{ fontSize: 13 }}>Return here any time to switch between Solo, Shop and Multi-branch.</p>
        <label className="label" htmlFor="license-payment-provider">Payment provider</label>
        <select id="license-payment-provider" className="input" value={provider} onChange={(e) => setProvider(e.target.value)} style={{ maxWidth: 320, marginBottom: 12 }}>
          <option value="paystack">Paystack · Cards, eligible wallets, Capitec Pay & EFT</option>
          <option value="payfast">PayFast · Cards & Instant EFT</option>
        </select>
        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))' }}>
          {TIERS.map((t) => {
            const currentPlan = String(billingInfo?.plan || status?.meta?.plan || '').toLowerCase();
            const isCurrent = currentPlan === t.id;
            const currentIndex = TIERS.findIndex(x => x.id === currentPlan);
            const targetIndex = TIERS.findIndex(x => x.id === t.id);
            const action = isCurrent ? 'Current plan' : currentIndex < 0 || targetIndex > currentIndex ? 'Upgrade to ' + t.name : 'Switch to ' + t.name;
            return <div key={t.id} style={{ border: isCurrent || t.recommended ? '2px solid var(--green,#22c55e)' : '1px solid var(--border,rgba(255,255,255,.12))', borderRadius: 12, padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}><strong>{t.name}</strong>{isCurrent && <span className="badge">Active</span>}</div>
              <div className="muted" style={{ fontSize: 11, margin: '4px 0 8px' }}>{t.priceHint}</div>
              <ul style={{ margin: '0 0 10px', paddingLeft: 16, fontSize: 12 }}>{t.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
              <button type="button" className={isCurrent ? 'btn btn-outline btn-sm' : 'btn btn-primary btn-sm'} style={{ width: '100%' }} disabled={busy || !email.includes('@') || isCurrent} onClick={() => buy(t.id)}>{action}</button>
            </div>;
          })}
        </div>
      </div>

      {!licensed && !billingInfo?.licensed && (
        <div className="card" style={{ marginBottom: '1rem', borderLeft: '4px solid var(--warn, #f59e0b)' }}>
          <strong>{trialLeft != null && trialLeft <= 0 ? 'Trial ended (soft)' : 'Trial / unlicensed workspace'}</strong>
          <p className="muted" style={{ margin: '0.35rem 0 0' }}>
            Alpha soft mode keeps the desk open. Pay when ready — no manual approve on the server.
          </p>
        </div>
      )}

      {(licensed || billingInfo?.licensed) && (
        <div className="card" style={{ marginBottom: '1rem', borderLeft: '4px solid var(--green, #10b981)' }}>
          <strong>Licence active</strong>
          <p className="muted" style={{ margin: '0.35rem 0 0' }}>Your {status?.meta?.plan || billingInfo?.plan || 'paid'} plan is active. You can change plans above at any time.</p>
          {billingInfo?.paidAt ? <p className="muted">Last payment: {billingInfo.paidAt}</p> : null}
        </div>
      )}
      {billingInfo && !billingInfo.licensed && billingInfo.ok === false && <div className="card" role="status"><strong>Billing status unavailable</strong><p className="muted">{billingInfo.error}</p></div>}

      <div className="grid-stats" style={{ marginBottom: '1rem' }}>
        <StatCard label="Status" value={(licensed || billingInfo?.licensed) ? 'Licensed' : (billingInfo?.status || 'Soft trial')} tone={(licensed || billingInfo?.licensed) ? 'good' : 'warn'} />
        <StatCard label="Trial days left" value={trialLeft ?? '—'} tone={trialLeft != null && trialLeft <= 7 ? 'bad' : undefined} />
        <StatCard label="Handshake" value={status?.handshakeOk ? 'OK' : 'Pending'} tone={status?.handshakeOk ? 'good' : 'warn'} />
        <StatCard label="Connectivity" value={online ? 'Online' : 'Offline'} tone={online ? 'good' : 'warn'} />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <Link className="btn btn-outline" to="/settings">Settings / backup</Link>
      </div>

      {!status && <EmptyState title="Loading license status…" hint="If this hangs, check network and server URL." />}
    </PageFade>
  )
}
