import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import * as db from '../lib/db'
import { STORES } from '../lib/db'
import { getSession, setSession } from '../lib/storage'
import { hashPassword, verifyPassword } from '../lib/hash'
import { VAT_RATE_DEFAULT } from '../config'
import { Sync } from '../lib/sync'
import { canUseCloudSync } from '../lib/soloMode'
import { ensureWorkspaceSynced, flushPushQueue, describeEnsureResult } from '../lib/workspaceSync'
import { cloudLogin, cloudRegister } from '../lib/cloudAuth'

const AppCtx = createContext(null)
const FIVE_MIN_MS = 5 * 60 * 1000

export function AppProvider({ children }) {
  const [ready, setReady] = useState(false)
  const [user, setUser] = useState(null)
  const [company, setCompany] = useState(null)
  const [clients, setClients] = useState([])
  const [invoices, setInvoices] = useState([])
  const [quotes, setQuotes] = useState([])
  const [tickets, setTickets] = useState([])
  const [products, setProducts] = useState([])
  const [services, setServices] = useState([])
  const [expenses, setExpenses] = useState([])
  const [payments, setPayments] = useState([])
  const [employees, setEmployees] = useState([])
  const [payslips, setPayslips] = useState([])
  const [bankTxns, setBankTxns] = useState([])
  const [journal, setJournal] = useState([])
  const [accounts, setAccounts] = useState([])
  const [timeEntries, setTimeEntries] = useState([])
  const [toasts, setToasts] = useState([])
  const [theme, setTheme] = useState(() => localStorage.getItem('sa_theme') || 'light')
  const [density, setDensity] = useState(() => localStorage.getItem('sa_density') || 'comfortable')
  const [vatEnabled, setVatEnabled] = useState(true)
  const [vatRate, setVatRate] = useState(VAT_RATE_DEFAULT)
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const skipAutoPush = useRef(true)

  const dismissToast = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), [])
  const toast = useCallback((message, type = 'info') => {
    const id = crypto.randomUUID()
    setToasts((t) => [...t, { id, message, type }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500)
  }, [])

  const refresh = useCallback(async () => {
    const c = await db.getCompany()
    setCompany(c)
    const snap = { company: c, clients: [], invoices: [], quotes: [], tickets: [], payments: [], products: [], services: [], expenses: [] }
    const pairs = [
      [STORES.clients, setClients, 'clients'], [STORES.invoices, setInvoices, 'invoices'],
      [STORES.quotes, setQuotes, 'quotes'], [STORES.tickets, setTickets, 'tickets'],
      [STORES.products, setProducts, 'products'], [STORES.services, setServices, 'services'],
      [STORES.expenses, setExpenses, 'expenses'], [STORES.payments, setPayments, 'payments'],
      [STORES.employees, setEmployees, null], [STORES.payslips, setPayslips, null],
      [STORES.bankTxns, setBankTxns, null], [STORES.journal, setJournal, null],
      [STORES.accounts, setAccounts, null], [STORES.timeEntries, setTimeEntries, null],
    ]
    for (const [store, setter, key] of pairs) {
      const rows = (await db.getAll(store)) || []
      setter(rows)
      if (key) snap[key] = rows
    }
    setVatEnabled((await db.getSetting('vatEnabled', true)) !== false)
    setVatRate(Number(await db.getSetting('vatRate', VAT_RATE_DEFAULT)) || VAT_RATE_DEFAULT)
    if (skipAutoPush.current) skipAutoPush.current = false
    else if (canUseCloudSync() && Sync.isLoggedIn()) Sync.scheduleAutoPush(snap, 2500)
  }, [])

  useEffect(() => {
    const on = () => { setOnline(true); if (canUseCloudSync() && Sync.isLoggedIn()) flushPushQueue().catch(() => {}) }
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  useEffect(() => {
    ;(async () => {
      try {
        setUser(getSession())
        await refresh()
        if (!(await db.getSetting('trialStartedAt', null))) await db.setSetting('trialStartedAt', new Date().toISOString())
        if (canUseCloudSync() && Sync.isLoggedIn()) {
          try {
            const result = await ensureWorkspaceSynced()
            skipAutoPush.current = true
            await refresh()
            skipAutoPush.current = false
            if (result?.ok && result.action && !['both_empty', 'none'].includes(result.action)) {
              toast(describeEnsureResult(result), 'success')
            }
          } catch (e) { console.warn('[boot]', e.message || e) }
          setTimeout(() => { flushPushQueue().catch(() => {}); ensureWorkspaceSynced().catch(() => {}) }, 8000)
        }
      } catch (e) {
        toast('Storage error: ' + (e.message || e), 'error')
      } finally {
        setReady(true)
      }
    })()
  }, [refresh, toast])

  /* App → server every 5 minutes so Git always has a recent snapshot */
  useEffect(() => {
    if (!ready) return
    const tick = () => {
      if (!canUseCloudSync() || !Sync.isLoggedIn() || !navigator.onLine) return
      flushPushQueue()
        .then(() => ensureWorkspaceSynced())
        .then((r) => {
          if (r?.ok && r.action && !['both_empty', 'none', 'queued'].includes(r.action)) {
            console.log('[5min-sync]', r.action)
          }
        })
        .catch((e) => console.warn('[5min-sync]', e.message || e))
    }
    const id = setInterval(tick, FIVE_MIN_MS)
    return () => clearInterval(id)
  }, [ready])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('sa_theme', theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem('sa_density', density)
    document.documentElement.dataset.density = density
  }, [density])

  const login = (username, password) =>
    cloudLogin(username, password, { online, toast, setSession, setUser, refresh, skipAutoPush })

  const register = (form) => cloudRegister(form, { online, toast, setSession, setUser, refresh })

  /**
   * Password reset:
   * - With recoveryCode → cloud reset via sync server (any device).
   * - Without code → local-only reset for profiles on this device.
   */
  const resetPassword = async ({ usernameOrEmail, emailConfirm, newPassword, recoveryCode }) => {
    const emailNeedle = String(emailConfirm || usernameOrEmail || '').trim().toLowerCase()
    if (!newPassword || newPassword.length < 6) throw new Error('New password must be at least 6 characters')

    if (recoveryCode) {
      if (!emailNeedle) throw new Error('Enter the account email')
      if (!canUseCloudSync()) throw new Error('Cloud sync is off — turn Solo mode off in Settings')
      const data = await Sync.resetPasswordWithCode(emailNeedle, recoveryCode, newPassword)
      try {
        const users = (await db.getAll(STORES.users)) || []
        let u = users.find((x) => String(x.email || '').trim().toLowerCase() === emailNeedle)
        const hashed = await hashPassword(newPassword)
        if (u) {
          await db.put(STORES.users, { ...u, password: hashed, email: emailNeedle })
        } else {
          await db.put(STORES.users, {
            id: data.user?.id || crypto.randomUUID?.() || 'u_' + Date.now(),
            username: emailNeedle.split('@')[0],
            email: emailNeedle,
            name: data.user?.name || emailNeedle.split('@')[0],
            password: hashed,
          })
        }
        if (data.token) {
          setSession({ email: emailNeedle, name: data.user?.name })
          setUser({ email: emailNeedle, name: data.user?.name })
        }
      } catch (e) {
        console.warn('[resetPassword] local mirror', e.message || e)
      }
      return { cloud: true, token: !!data.token, user: data.user }
    }

    const users = (await db.getAll(STORES.users)) || []
    const needle = String(usernameOrEmail || '').trim().toLowerCase()
    if (!needle) throw new Error('Enter your username or email')
    if (!emailNeedle) throw new Error('Confirm the account email')
    const u = users.find((x) => {
      const un = String(x.username || '').trim().toLowerCase()
      const em = String(x.email || '').trim().toLowerCase()
      return un === needle || em === needle
    })
    if (!u) throw new Error('No account found with that username or email on this device. Use recovery code for cloud reset.')
    if (String(u.email || '').trim().toLowerCase() !== emailNeedle) throw new Error('Email does not match this account')
    await db.put(STORES.users, { ...u, password: await hashPassword(newPassword) })
    return { cloud: false }
  }

  const logout = () => { try { Sync.logout() } catch {}; setSession(null); setUser(null) }

  const syncNow = async () => {
    if (!canUseCloudSync()) throw new Error('Solo offline mode is on — turn it off in Settings')
    if (!Sync.isLoggedIn()) throw new Error('Sign in with your cloud email first (Login screen)')
    await flushPushQueue().catch(() => {})
    const ensure = await ensureWorkspaceSynced({ forcePush: true })
    skipAutoPush.current = true
    await refresh()
    skipAutoPush.current = false
    return { ok: ensure.ok, message: describeEnsureResult(ensure), action: ensure.action }
  }

  const value = {
    ready, user, company, clients, invoices, quotes, tickets, products, services,
    expenses, payments, employees, payslips, bankTxns, journal, accounts, timeEntries,
    toasts, toast, dismissToast, theme, setTheme, density, setDensity,
    vatEnabled, vatRate, setVatEnabled, setVatRate,
    online, refresh, login, register, resetPassword, logout, setCompany, syncNow,
  }

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}

export function useApp() {
  const ctx = useContext(AppCtx)
  if (!ctx) throw new Error('useApp outside provider')
  return ctx
}
