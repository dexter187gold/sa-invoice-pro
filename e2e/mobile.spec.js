import { test, expect } from '@playwright/test'
import { unlockVisibility, expectPageAlive } from './helpers.js'

test.describe('Android-sized PWA smoke', () => {
  test('login route remains usable at a phone viewport', async ({ page }) => {
    await unlockVisibility(page)
    await page.goto('/login')
    const body = await expectPageAlive(page)
    expect(body.length).toBeGreaterThan(10)
    const dimensions = await page.evaluate(() => ({
      width: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      viewport: document.querySelector('meta[name="viewport"]')?.content || '',
    }))
    expect(dimensions.width).toBeLessThanOrEqual(500)
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.width + 2)
    expect(dimensions.viewport).toContain('viewport-fit=cover')
  })

  test('manifest exposes useful home-screen shortcuts', async ({ page }) => {
    await page.goto('/login')
    const manifest = await page.evaluate(async () => {
      const response = await fetch('/manifest.webmanifest')
      return response.ok ? response.json() : null
    })
    expect(manifest).toBeTruthy()
    expect(manifest.orientation).toBe('any')
    expect(manifest.shortcuts.map((item) => item.url)).toEqual(
      expect.arrayContaining(['/invoices/new', '/clients', '/bank']),
    )
  })
})
