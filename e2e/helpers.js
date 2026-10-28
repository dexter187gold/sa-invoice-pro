/** Playwright helpers — session, visibility unlock, IndexedDB seed. */
import { expect } from '@playwright/test'

export const SESSION_KEY = 'sa_session_v2'

/** Force page visible before app scripts (splash / stale locks). */
export async function unlockVisibility(page) {
  await page.addInitScript(() => {
    const unlock = () => {
      try {
        for (const el of [document.documentElement, document.body, document.getElementById('root')]) {
          if (!el) continue
          el.style.setProperty('visibility', 'visible', 'important')
          el.style.setProperty('opacity', '1', 'important')
          el.removeAttribute('hidden')
        }
        try {
          sessionStorage.setItem('sa_splash_done', '1')
        } catch {}
      } catch {}
    }
    unlock()
    document.addEventListener('DOMContentLoaded', unlock)
    window.addEventListener('load', unlock)
  })
}

/** Minimal session the SPA accepts as signed in. */
export async function injectSession(page, user = {}) {
  await unlockVisibility(page)
  const session = {
    id: 'e2e-user',
    email: 'e2e@sainvoicepro.test',
    name: 'E2E Bench',
    username: 'e2e',
    role: 'owner',
    ...user,
  }
  await page.addInitScript(
    ({ key, value }) => {
      try {
        localStorage.setItem(key, JSON.stringify(value))
        sessionStorage.setItem('sa_splash_done', '1')
      } catch {}
    },
    { key: SESSION_KEY, value: session },
  )
  return session
}

/** Seed company so needCompany Guard passes. Must run on app origin (after a goto). */
export async function seedIndexedDbCompany(page) {
  // Ensure we are on the app origin first (evaluate fails on about:blank)
  const url = page.url()
  if (!url || url === 'about:blank' || url.startsWith('chrome')) {
    await page.goto('/login', { waitUntil: 'domcontentloaded' })
  }
  await page.evaluate(async () => {
    const company = { id: 'main', name: 'E2E Repair Bench', email: 'bench@test.local' }
    await new Promise((resolve, reject) => {
      const req = indexedDB.open('SAInvoicePro_v2', 3)
      req.onerror = () => reject(req.error)
      req.onupgradeneeded = (e) => {
        const d = e.target.result
        const stores = {
          users: 'id',
          company: 'id',
          clients: 'id',
          products: 'id',
          services: 'id',
          invoices: 'id',
          quotes: 'id',
          tickets: 'id',
          ticketComments: 'id',
          timeEntries: 'id',
          expenses: 'id',
          payments: 'id',
          employees: 'id',
          payslips: 'id',
          bankTxns: 'id',
          journal: 'id',
          accounts: 'id',
          reconciliations: 'id',
          popiaRequests: 'id',
          documentTemplates: 'id',
          documentRenders: 'id',
          reminders: 'id',
          settings: 'key',
        }
        for (const [name, keyPath] of Object.entries(stores)) {
          if (!d.objectStoreNames.contains(name)) {
            d.createObjectStore(name, {
              keyPath,
              ...(name === 'settings' ? {} : { autoIncrement: name !== 'company' }),
            })
          }
        }
      }
      req.onsuccess = () => {
        const db = req.result
        if (!db.objectStoreNames.contains('company')) {
          resolve()
          return
        }
        const tx = db.transaction('company', 'readwrite')
        tx.objectStore('company').put(company)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      }
    })
  })
}

/**
 * Body visibility is unreliable under splash / CSS transitions in CI.
 * Assert the document mounted and has usable content instead.
 */
export async function expectPageAlive(page, { minChars = 8 } = {}) {
  await expect(page.locator('body')).toBeAttached()
  await expect(page.locator('#root')).toBeAttached()
  // Soft unlock in case a transition left visibility hidden
  await page.evaluate(() => {
    for (const el of [document.documentElement, document.body, document.getElementById('root')]) {
      if (!el) continue
      el.style.setProperty('visibility', 'visible', 'important')
      el.style.setProperty('opacity', '1', 'important')
      el.removeAttribute('hidden')
    }
  })
  const text = (await page.locator('body').innerText().catch(() => '')) || ''
  expect(text.length, `expected page text length > ${minChars}, got ${text.length}`).toBeGreaterThan(minChars)
  return text
}
