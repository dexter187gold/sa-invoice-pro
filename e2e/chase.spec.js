import { test, expect } from '@playwright/test'
import { unlockVisibility, expectPageAlive, injectSession, seedIndexedDbCompany } from './helpers.js'

test.describe('WhatsApp chase', () => {
  test.beforeEach(async ({ page }) => {
    await unlockVisibility(page)
  })

  test('wa-chase route does not fatal without session', async ({ page }) => {
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.goto('/wa-chase')
    await page.waitForTimeout(800)
    const fatal = errors.filter((e) => /Cannot find module|is not defined|Unexpected token/i.test(e))
    expect(fatal, fatal.join('\n')).toHaveLength(0)
  })

  test('wa-chase with session shows queue chrome or redirects safely', async ({ page }) => {
    await injectSession(page)
    await page.goto('/login', { waitUntil: 'domcontentloaded' })
    await seedIndexedDbCompany(page)
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.goto('/wa-chase', { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    const body = await expectPageAlive(page)
    // Authenticated desk or login/setup redirect — both OK if no module crash
    expect(
      /chase|WhatsApp|queue|invoice|Open next|filter|Login|Setup|workspace|E2E/i.test(body),
    ).toBeTruthy()
    const fatal = errors.filter((e) => /Cannot find module|is not defined|Unexpected token/i.test(e))
    expect(fatal, fatal.join('\n')).toHaveLength(0)
  })
})
