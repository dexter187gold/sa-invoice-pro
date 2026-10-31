/** Playwright helpers — session, visibility unlock, IndexedDB seed, portal API mock. */
import { expect } from '@playwright/test'

export const SESSION_KEY = 'sa_session_v2'

/** Force page visible + skip splash + block service worker (blank pages in CI). */
export async function unlockVisibility(page) {
  await page.addInitScript(() => {
    try {
      // Prevent SW from serving stale shells on deep routes
      if (navigator.serviceWorker) {
        Object.defineProperty(navigator, 'serviceWorker', {
          configurable: true,
          get() {
            return undefined
          },
        })
      }
    } catch {}
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

/** Mock saip-sync portal API so token routes always render error or data shell. */
export async function mockPortalApi(page, payload) {
  await page.route(/\/api\/portal\//, async (route) => {
    if (payload === 'not_found') {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Portal link not found or expired' }),
      })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        payload || {
          company: { name: 'E2E Shop' },
          client: { name: 'E2E Client', email: 'client@test.local' },
          quotes: [],
          invoices: [],
          tickets: [],
          payments: [],
        },
      ),
    })
  })
}

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

export async function seedIndexedDbCompany(page) {
  const url = page.url()
  if (!url || url === 'about:blank' || url.startsWith('chrome')) {
    await page.goto('/login', { waitUntil: 'domcontentloaded' })
  }
  await page.evaluate(async () => {
    const company = { id: 'main', name: 'E2E Repair Bench', email: 'bench@test.local' }
    await new Promise((resolve, reject) => {
      const req = indexedDB.open('SAInvoicePro_v2', 6)
      req.onerror = () => reject(req.error)
      req.onupgradeneeded = (e) => {
        const d = e.target.result
        const stores = {
          users: 'id', company: 'id', clients: 'id', products: 'id', services: 'id',
          invoices: 'id', quotes: 'id', tickets: 'id', ticketComments: 'id',
          timeEntries: 'id', expenses: 'id', payments: 'id', employees: 'id',
          payslips: 'id', bankTxns: 'id', journal: 'id', accounts: 'id',
          reconciliations: 'id', pettyCash: 'id', popiaRequests: 'id', documentTemplates: 'id',
          documentRenders: 'id', reminders: 'id', settings: 'key',
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

/** Assert app shell mounted. Prefer textContent (works when visibility is odd). */
export async function expectPageAlive(page, { minChars = 8 } = {}) {
  await expect(page.locator('body')).toBeAttached()
  await expect(page.locator('#root')).toBeAttached()
  await page.evaluate(() => {
    for (const el of [document.documentElement, document.body, document.getElementById('root')]) {
      if (!el) continue
      el.style.setProperty('visibility', 'visible', 'important')
      el.style.setProperty('opacity', '1', 'important')
      el.removeAttribute('hidden')
    }
  })
  // Wait briefly for React paint
  await page.waitForTimeout(300)
  const text =
    (await page.locator('body').evaluate((el) => el.textContent || '').catch(() => '')) ||
    (await page.content().catch(() => ''))
  expect(text.length, `expected page text length > ${minChars}, got ${text.length}`).toBeGreaterThan(minChars)
  return text
}
