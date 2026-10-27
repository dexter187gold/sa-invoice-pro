import { test, expect } from '@playwright/test'
import { injectSession } from './helpers.js'

test.describe('Quotes desk', () => {
  test('quotes route loads with session', async ({ page }) => {
    await injectSession(page)
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.goto('/quotes')
    await page.waitForTimeout(1000)
    await expect(page.locator('body')).toBeVisible()
    const body = await page.textContent('body')
    expect(body && /quote|convert|portal|COD/i.test(body)).toBeTruthy()
    const fatal = errors.filter((e) => /Cannot find module|is not defined|Unexpected token/i.test(e))
    expect(fatal, fatal.join('\n')).toHaveLength(0)
  })

  test('portal payments section does not crash', async ({ page }) => {
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.goto('/portal/demo-token/payments')
    await page.waitForTimeout(800)
    await expect(page.locator('body')).toBeVisible()
    const fatal = errors.filter((e) => /Cannot find module|is not defined|Unexpected token/i.test(e))
    expect(fatal, fatal.join('\n')).toHaveLength(0)
  })
})
