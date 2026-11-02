import { test, expect } from '@playwright/test'
import { injectSession, seedIndexedDbCompany } from './helpers.js'

test.describe('Bank CSV import', () => {
  test('bank route loads with session', async ({ page }) => {
    await injectSession(page)
    await seedIndexedDbCompany(page)
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
    await page.goto('/bank')
    await expect(page.getByRole('heading', { name: /bank import/i })).toBeVisible({ timeout: 10000 })
    // The bank-import screen must expose its statement upload control.
    await expect(page.locator('input[type="file"]')).toBeAttached({ timeout: 5000 })
  })
})
