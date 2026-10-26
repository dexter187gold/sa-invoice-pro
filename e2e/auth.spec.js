import { test, expect } from '@playwright/test'
import { injectSession, seedIndexedDbCompany } from './helpers.js'

test.describe('Authenticated desk smoke', () => {
  test.beforeEach(async ({ page }) => {
    await injectSession(page)
  })

  test('session reaches home or setup without login wall', async ({ page }) => {
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.goto('/')
    await page.waitForTimeout(1200)
    // First visit may land setup (no company) or home after seed
    const url = page.url()
    expect(url.includes('/login')).toBeFalsy()
    const fatal = errors.filter((e) => /Cannot find module|is not defined|Unexpected token/i.test(e))
    expect(fatal, fatal.join('\n')).toHaveLength(0)
  })

  test('seed company then open invoices shell', async ({ page }) => {
    await page.goto('/setup')
    await page.waitForTimeout(600)
    await seedIndexedDbCompany(page)
    await page.goto('/invoices')
    await page.waitForTimeout(1000)
    await expect(page.locator('body')).toBeVisible()
    // Should not bounce to login
    expect(page.url()).not.toContain('/login')
    const text = await page.textContent('body')
    expect(text && text.length).toBeGreaterThan(20)
  })

  test('quotes page loads under session', async ({ page }) => {
    await page.goto('/')
    await seedIndexedDbCompany(page)
    await page.goto('/quotes')
    await page.waitForTimeout(1000)
    expect(page.url()).not.toContain('/login')
    await expect(page.locator('body')).toBeVisible()
  })

  test('products page loads under session', async ({ page }) => {
    await page.goto('/')
    await seedIndexedDbCompany(page)
    await page.goto('/products')
    await page.waitForTimeout(1000)
    expect(page.url()).not.toContain('/login')
    const body = await page.textContent('body')
    expect(body && /product|service|catalog|stock/i.test(body)).toBeTruthy()
  })
})
