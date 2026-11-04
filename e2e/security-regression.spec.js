import { test, expect } from '@playwright/test'
import { injectSession, seedIndexedDbCompany } from './helpers.js'

const DEVICE_KEYS = ['licenseKey', 'licenseMeta', 'activationToken', 'licenseOfflineBlob', 'licenseEmail', 'licenseServerUrl', 'hwid', 'handshakeOk', 'lastLicenseExchange', 'pendingLicenseKey', 'trialStartedAt']

async function readSettings(page) {
  return page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const req = indexedDB.open('SAInvoicePro_v2', 6)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    return new Promise((resolve, reject) => {
      const tx = db.transaction('settings', 'readonly')
      const req = tx.objectStore('settings').getAll()
      req.onsuccess = () => resolve(req.result || [])
      req.onerror = () => reject(req.error)
    })
  })
}

test.describe('Security regression — device entitlement and profile access', () => {
  test('device entitlement records are not erased by an ordinary reload', async ({ page }) => {
    await injectSession(page)
    await page.goto('/login')
    await seedIndexedDbCompany(page)
    await page.evaluate(async (keys) => {
      const db = await new Promise((resolve, reject) => {
        const req = indexedDB.open('SAInvoicePro_v2', 6)
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      })
      await new Promise((resolve, reject) => {
        const tx = db.transaction('settings', 'readwrite')
        for (const key of keys) tx.objectStore('settings').put({ key, value: key === 'licenseMeta' ? { server: true, hwid: 'e2e-device' } : 'e2e-sentinel' })
        tx.oncomplete = resolve
        tx.onerror = () => reject(tx.error)
      })
    }, DEVICE_KEYS)
    await page.reload()
    await page.waitForTimeout(500)
    const rows = await readSettings(page)
    for (const key of DEVICE_KEYS) expect(rows.some((row) => row.key === key), 'missing device setting: ' + key).toBeTruthy()
  })

  test('security settings expose the supported inactivity-lock choices', async ({ page }) => {
    await injectSession(page)
    await page.goto('/login')
    await seedIndexedDbCompany(page)
    await page.goto('/settings')
    await expect(page.getByRole('heading', { name: /settings/i }).first()).toBeVisible()
    const security = page.getByTestId('settings-tab-security')
    await expect(security).toBeVisible({ timeout: 15000 })
    await security.click()
    const lock = page.locator('#auto-lock-minutes')
    await expect(lock).toBeVisible()
    await expect(lock.locator('option')).toHaveCount(3)
    await expect(lock.locator('option').nth(0)).toHaveValue('5')
    await expect(lock.locator('option').nth(1)).toHaveValue('15')
    await expect(lock.locator('option').nth(2)).toHaveValue('30')
  })
})
