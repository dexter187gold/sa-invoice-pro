import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import * as db from '../lib/db'
import { STORES } from '../lib/db'
import { getSession, setSession } from '../lib/storage'
import { VAT_RATE_DEFAULT } from '../config'

const AppCtx = createContext(null)

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

  const dismissToast = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  const toast = useCallback((message, type = 'info') => {
    const id = crypto.randomUUID()
    setToasts((t) => [...t, { id, message, type }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000)
  }, [])

  const refresh = useCallback(async () => {
    const keys = [
      ['company', null],
      [STORES.clients, setClients],
      [STORES.invoices, setInvoices],
      [STORES.quotes, setQuotes],
      [STORES.tickets, setTickets],
      [STORES.products, setProducts],
      [STORES.services, setServices],
      [STORES.expenses, setExpenses],
      [STORES.payments, setPayments],
      [STORES.employees, setEmployees],
      [STORES.payslips, setPayslips],
      [STORES.bankTxns, setBankTxns],
      [STORES.journal, setJournal],
      [STORES.accounts, setAccounts],
      [STORES.timeEntries, setTimeEntries],
    ]
    const c = await db.getCompany()
    setCompany(c)
    for (const [store, setter] of keys) {
      if (!setter) continue
      setter((await db.getAll(store)) || [])
    }
    const ve = await db.getSetting('vatEnabled', true)
    const vr = await db.getSetting('vatRate', VAT_RATE_DEFAULT)
    setVatEnabled(ve !== false)
    setVatRate(Number(vr) || VAT_RATE_DEFAULT)
  }, [])

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  useEffect(() => {
    ;(async () => {
      try {
        setUser(getSession())
        await refresh()
        let trial = await db.getSetting('trialStartedAt', null)
        if (!trial) await db.setSetting('trialStartedAt', new Date().toISOString())
      } catch (e) {
        console.error(e)
        toast('Storage error: ' + (e.message || e), 'error')
      } finally {
        setReady(true)
      }
    })()
  }, [refresh, toast])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('sa_theme', theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem('sa_density', density)
    document.documentElement.dataset.density = density
  }, [density])

  const login = async (username, password) => {
    const users = (await db.getAll(STORES.users)) || []
    const u = users.find((x) => (x.username === username || x.email === username) && x.password === password)
    if (!u) throw new Error('Invalid username or password')
    const session = { id: u.id, username: u.username, email: u.email, name: u.name }
    setSession(session)
    setUser(session)
    await refresh()
    return session
  }

  const register = async ({ username, email, password, name }) => {
    const users = (await db.getAll(STORES.users)) || []
    if (users.some((u) => u.username === username || u.email === email)) throw new Error('User already exists')
    if (!password || password.length < 6) throw new Error('Password must be at least 6 characters')
    const u = await db.add(STORES.users, { username, email, password, name: name || username })
    const session = { id: u.id, username, email, name: name || username }
    setSession(session)
    setUser(session)
    return session
  }

  const logout = () => {
    setSession(null)
    setUser(null)
  }

  const value = {
    ready, user, company, clients, invoices, quotes, tickets, products, services,
    expenses, payments, employees, payslips, bankTxns, journal, accounts, timeEntries,
    toasts, toast, dismissToast, theme, setTheme, density, setDensity,
    vatEnabled, vatRate, setVatEnabled, setVatRate,
    online, refresh, login, register, logout, setCompany,
  }

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}

export function useApp() {
  const ctx = useContext(AppCtx)
  if (!ctx) throw new Error('useApp outside provider')
  return ctx
}
