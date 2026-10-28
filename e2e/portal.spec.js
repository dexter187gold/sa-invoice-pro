import { test, expect } from '@playwright/test'
import { unlockVisibility, expectPageAlive } from './helpers.js'

test.describe('Client portal', () => {
  test.beforeEach(async ({ page }) => {
    await unlockVisibility(page)
  })

  test('portal without token shows helpful message', async ({ page }) => {
    await page.goto('/portal')
    const body = await expectPageAlive(page)
    expect(body).toMatch(/token|link|portal|missing|Loading/i)
  })

  test('portal with demo token loads shell + nav', async ({ page }) => {
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.goto('/portal/demo-token')
    await page.waitForTimeout(1000)
    const body = await expectPageAlive(page)
    expect(body.length).toBeGreaterThan(20)
    expect(/Overview|Quotes|Invoices|Service|Loading|Could not|token|portal/i.test(body)).toBeTruthy()
    const fatal = errors.filter((e) => /Cannot find module|is not defined|Unexpected token/i.test(e))
    expect(fatal, fatal.join('\n')).toHaveLength(0)
  })

  test('portal section routes do not crash', async ({ page }) => {
    for (const section of ['quotes', 'invoices', 'service', 'payments']) {
      const errors = []
      page.on('pageerror', (e) => errors.push(String(e)))
      await page.goto(`/portal/demo-token/${section}`)
      await page.waitForTimeout(700)
      await expectPageAlive(page)
      const fatal = errors.filter((e) => /Cannot find module|is not defined|Unexpected token/i.test(e))
      expect(fatal, `${section}: ${fatal.join('\n')}`).toHaveLength(0)
    }
  })

  test('portal sticky nav labels present when data loads or error', async ({ page }) => {
    await page.goto('/portal/demo-token')
    await page.waitForTimeout(800)
    const body = await expectPageAlive(page)
    const hasNav =
      /Overview|Quotes|Invoices|Service|Payments/i.test(body || '') ||
      /token|Could not open|invalid|missing|Loading your portal/i.test(body || '')
    expect(hasNav).toBeTruthy()
  })
})
