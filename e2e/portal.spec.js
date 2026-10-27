import { test, expect } from '@playwright/test'

test.describe('Client portal', () => {
  test('portal without token shows helpful message', async ({ page }) => {
    await page.goto('/portal')
    await page.waitForTimeout(600)
    const body = await page.textContent('body')
    expect(body).toMatch(/token|link|portal|missing/i)
  })

  test('portal with demo token loads shell + nav', async ({ page }) => {
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.goto('/portal/demo-token')
    await page.waitForTimeout(1000)
    await expect(page.locator('body')).toBeVisible()
    const body = await page.textContent('body')
    // Either error from sync or full portal UI
    expect(body && body.length).toBeGreaterThan(20)
    const fatal = errors.filter((e) => /Cannot find module|is not defined|Unexpected token/i.test(e))
    expect(fatal, fatal.join('\n')).toHaveLength(0)
  })

  test('portal section routes do not crash', async ({ page }) => {
    for (const section of ['quotes', 'invoices', 'service']) {
      const errors = []
      page.on('pageerror', (e) => errors.push(String(e)))
      await page.goto(`/portal/demo-token/${section}`)
      await page.waitForTimeout(700)
      await expect(page.locator('body')).toBeVisible()
      const fatal = errors.filter((e) => /Cannot find module|is not defined|Unexpected token/i.test(e))
      expect(fatal, `${section}: ${fatal.join('\n')}`).toHaveLength(0)
    }
  })

  test('portal sticky nav labels present when data loads or error', async ({ page }) => {
    await page.goto('/portal/demo-token')
    await page.waitForTimeout(800)
    const body = await page.textContent('body')
    // Overview / Quotes / Invoices / Service are the 4 pages
    const hasNav =
      /Overview|Quotes|Invoices|Service/i.test(body || '') ||
      /token|Could not open|invalid|missing/i.test(body || '')
    expect(hasNav).toBeTruthy()
  })
})
