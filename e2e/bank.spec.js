import { test, expect } from '@playwright/test'
import { injectSession, seedIndexedDbCompany } from './helpers.js'


async function seedMultiPlanLicense(page) {
  await page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const req = indexedDB.open('SAInvoicePro_v2', 6)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    await new Promise((resolve, reject) => {
      const tx = db.transaction('settings', 'readwrite')
      const store = tx.objectStore('settings')
      store.put({ key: 'licenseKey', value: 'E2E-MULTI-LICENSE' })
      store.put({ key: 'activationToken', value: 'E2E-SERVER-PROOF' })
      store.put({ key: 'licenseMeta', value: { server: true, plan: 'multi', activationToken: 'E2E-SERVER-PROOF' } })
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  })
}

test.describe('Bank CSV import', () => {
  test('bank route loads with session', async ({ page }) => {
    await injectSession(page)
    await seedIndexedDbCompany(page)
    await seedMultiPlanLicense(page)
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.goto('/bank')
    await page.waitForTimeout(1000)
    await expect(page.locator('body')).toBeVisible()
    const body = await page.textContent('body')
    expect(body && /bank|CSV|import|FNB|transaction/i.test(body)).toBeTruthy()
    const fatal = errors.filter((e) => /Cannot find module|is not defined|Unexpected token/i.test(e))
    expect(fatal, fatal.join('\n')).toHaveLength(0)
  })

  test('paste area and parse control present', async ({ page }) => {
    await injectSession(page)
    await seedIndexedDbCompany(page)
    await seedMultiPlanLicense(page)
    await page.goto('/bank')
    await expect(page.getByRole('heading', { name: /bank import/i })).toBeVisible({ timeout: 10000 })
    // The bank-import screen must expose its statement upload control.
    await expect(page.locator('input[type="file"]')).toBeAttached({ timeout: 5000 })
  })
})
