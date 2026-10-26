const { test, expect } = require('@playwright/test')

test.describe('SA Invoice Pro smoke', () => {
  test('login page renders', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('body')).toBeVisible()
    await page.waitForTimeout(500)
    const body = await page.textContent('body')
    expect(body && body.length).toBeGreaterThan(10)
  })

  test('app boots without fatal error overlay', async ({ page }) => {
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.goto('/login')
    await page.waitForTimeout(1000)
    const fatal = errors.filter((e) => /Cannot find module|is not defined|Unexpected token/i.test(e))
    expect(fatal, fatal.join('\n')).toHaveLength(0)
  })

  test('root responds', async ({ page }) => {
    const res = await page.goto('/')
    expect(res).toBeTruthy()
  })
})
