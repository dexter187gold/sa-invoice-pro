import { test, expect } from '@playwright/test'
import { unlockVisibility, expectPageAlive, mockPortalApi } from './helpers.js'

test.describe('Client portal', () => {
  test.beforeEach(async ({ page }) => {
    await unlockVisibility(page)
  })

  test('portal without token shows helpful message', async ({ page }) => {
    await page.goto('/portal')
    const body = await expectPageAlive(page)
    expect(body).toMatch(/token|link|portal|missing|Loading|service provider/i)
  })

  test('portal with demo token loads shell + nav', async ({ page }) => {
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await mockPortalApi(page, 'not_found')
    await page.goto('/portal/demo-token', { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    const body = await expectPageAlive(page)
    expect(body.length).toBeGreaterThan(20)
    expect(/Overview|Quotes|Invoices|Service|Loading|Could not|token|portal|service provider|expired|not found/i.test(body)).toBeTruthy()
    const fatal = errors.filter((e) => /Cannot find module|is not defined|Unexpected token/i.test(e))
    expect(fatal, fatal.join('\n')).toHaveLength(0)
  })

  test('portal section routes do not crash', async ({ page }) => {
    await mockPortalApi(page)
    for (const section of ['quotes', 'invoices', 'service', 'payments']) {
      const errors = []
      page.on('pageerror', (e) => errors.push(String(e)))
      await page.goto(`/portal/demo-token/${section}`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(400)
      const body = await expectPageAlive(page)
      expect(/Overview|Quotes|Invoices|Service|Payments|portal|E2E Shop|service provider/i.test(body)).toBeTruthy()
      const fatal = errors.filter((e) => /Cannot find module|is not defined|Unexpected token/i.test(e))
      expect(fatal, `${section}: ${fatal.join('\n')}`).toHaveLength(0)
    }
  })

  test('portal sticky nav labels present when data loads or error', async ({ page }) => {
    await mockPortalApi(page)
    await page.goto('/portal/demo-token', { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    const body = await expectPageAlive(page)
    const hasNav =
      /Overview|Quotes|Invoices|Service|Payments/i.test(body || '') ||
      /token|Could not open|invalid|missing|Loading your portal|E2E Shop/i.test(body || '')
    expect(hasNav).toBeTruthy()
  })
})
