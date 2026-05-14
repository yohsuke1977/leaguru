import { chromium } from 'playwright'
import { mkdir } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.join(__dirname, '../lp-preview')
const BASE_URL = 'http://localhost:5174'

;(async () => {
  await mkdir(OUT_DIR, { recursive: true })
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()

  await page.goto(BASE_URL, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)

  // Hero
  await page.screenshot({ path: path.join(OUT_DIR, '01_hero.png'), fullPage: false })
  console.log('✓ 01_hero.png')

  // Admin showcase
  await page.evaluate(() => document.querySelector('#admin')?.scrollIntoView())
  await page.waitForTimeout(600)
  await page.screenshot({ path: path.join(OUT_DIR, '02_admin.png'), fullPage: false })
  console.log('✓ 02_admin.png')

  // Layout showcase
  await page.evaluate(() => document.querySelector('#layouts')?.scrollIntoView())
  await page.waitForTimeout(600)
  await page.screenshot({ path: path.join(OUT_DIR, '03_layouts.png'), fullPage: false })
  console.log('✓ 03_layouts.png')

  // Full page
  await page.goto(BASE_URL, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  await page.screenshot({ path: path.join(OUT_DIR, '00_full.png'), fullPage: true })
  console.log('✓ 00_full.png')

  await browser.close()
  console.log('\nDone! LP previews in ./lp-preview/')
})()
