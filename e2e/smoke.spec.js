import { test, expect } from '@playwright/test'
import { unlockVisibility, expectPageAlive } from './helpers.js'

test.describe('SA Invoice Pro smoke', () => {
  test.beforeEach(async ({ page }) => {
    await unlockVisibility(page)
  })

  test('login page renders', async ({ page }) => {
    await page.goto('/login')
    const body = await expectPageAlive(page)
    expect(body.length).toBeGreaterThan(10)
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

  test('portal route loads without crash', async ({ page }) => {
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.goto('/portal')
    await page.waitForTimeout(800)
    const body = await expectPageAlive(page)
    expect(/portal|token|link|SA Invoice|Loading/i.test(body)).toBeTruthy()
    const fatal = errors.filter((e) => /Cannot find module|is not defined|Unexpected token/i.test(e))
    expect(fatal, fatal.join('\n')).toHaveLength(0)
  })

  test('portal token path loads', async ({ page }) => {
    await page.goto('/portal/demo-token')
    const body = await expectPageAlive(page)
    expect(/portal|token|Loading|Could not|Overview|Quotes|invalid|missing/i.test(body)).toBeTruthy()
  })

  test('team route redirects or loads without module crash', async ({ page }) => {
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.goto('/team')
    await page.waitForTimeout(800)
    const fatal = errors.filter((e) => /Cannot find module|is not defined|Unexpected token/i.test(e))
    expect(fatal, fatal.join('\n')).toHaveLength(0)
  })

  test('branches route no module crash', async ({ page }) => {
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.goto('/branches')
    await page.waitForTimeout(800)
    const fatal = errors.filter((e) => /Cannot find module|is not defined|Unexpected token/i.test(e))
    expect(fatal, fatal.join('\n')).toHaveLength(0)
  })

  test('settings route no module crash', async ({ page }) => {
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.goto('/settings')
    await page.waitForTimeout(800)
    const fatal = errors.filter((e) => /Cannot find module|is not defined|Unexpected token/i.test(e))
    expect(fatal, fatal.join('\n')).toHaveLength(0)
  })

  test('bank route no module crash', async ({ page }) => {
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.goto('/bank')
    await page.waitForTimeout(800)
    const fatal = errors.filter((e) => /Cannot find module|is not defined|Unexpected token/i.test(e))
    expect(fatal, fatal.join('\n')).toHaveLength(0)
  })
})
