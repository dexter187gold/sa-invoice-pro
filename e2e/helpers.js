/** Playwright helpers — inject local session so Guard lets desk routes load. */

export const SESSION_KEY = 'sa_session_v2'

/** Minimal session the SPA accepts as "signed in". */
export async function injectSession(page, user = {}) {
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

/** Seed company so needCompany Guard passes. */
export async function injectCompanySeed(page) {
  await page.addInitScript(() => {
    // App loads company from IndexedDB; open a stub after load via evaluate on first navigation.
    window.__SA_E2E__ = { company: { id: 'main', name: 'E2E Repair Bench' } }
  })
}

export async function seedIndexedDbCompany(page) {
  await page.evaluate(async () => {
    const company = { id: 'main', name: 'E2E Repair Bench', email: 'bench@test.local' }
    await new Promise((resolve, reject) => {
      const req = indexedDB.open('SAInvoicePro_v2', 3)
      req.onerror = () => reject(req.error)
      req.onupgradeneeded = (e) => {
        const d = e.target.result
        const stores = {
          users: 'id', company: 'id', clients: 'id', products: 'id', services: 'id',
          invoices: 'id', quotes: 'id', tickets: 'id', ticketComments: 'id',
          timeEntries: 'id', expenses: 'id', payments: 'id', employees: 'id',
          payslips: 'id', bankTxns: 'id', journal: 'id', accounts: 'id',
          reconciliations: 'id', popiaRequests: 'id', documentTemplates: 'id',
          documentRenders: 'id', reminders: 'id', settings: 'key',
        }
        for (const [name, keyPath] of Object.entries(stores)) {
          if (!d.objectStoreNames.contains(name)) d.createObjectStore(name, { keyPath, ...(name === 'settings' ? {} : { autoIncrement: name !== 'company' }) })
        }
      }
      req.onsuccess = () => {
        const db = req.result
        const tx = db.transaction('company', 'readwrite')
        tx.objectStore('company').put(company)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      }
    })
  })
}
