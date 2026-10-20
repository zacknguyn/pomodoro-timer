// Isolated account fixtures only. No live login, database or GitHub requests.
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { chromium } from './browser.mjs'
const base = process.env.POMOGIT_APP_URL || 'http://127.0.0.1:5193'
const output = '/tmp/pomogit-floating-navigation-react'
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ args: ['--disable-dev-shm-usage', '--disable-gpu'] })
let checks = 0
try {
  for (const width of (process.env.POMOGIT_NAV_WIDTHS || '1440,1201,1024,800,390,375').split(',').map(Number)) for (const navigation of ['navbar', 'sidebar']) for (const brightness of ['light', 'dark']) {
    const context = await browser.newContext({ viewport: { width, height: Number(process.env.POMOGIT_NAV_HEIGHT || 900) }, reducedMotion: 'reduce' })
    await context.addInitScript(({ navigation, brightness }) => {
      localStorage.setItem('pomogit.workspace-opened', 'true')
      if (!localStorage.getItem('pomogit.work-protocol:navigation-fixture')) localStorage.setItem('pomogit.work-protocol:navigation-fixture', JSON.stringify({ navigation, brightness, motion: 'reduced' }))
    }, { navigation, brightness })
    const page = await context.newPage(), errors = [], writes = []
    page.on('pageerror', error => errors.push(error.message))
    const tasks = [
      { id: 'a', title: 'Fix the callback retry', nextStep: 'Reproduce the expired case', project: 'checkout-api', status: 'progress', notes: [], createdAt: '2026-10-15T10:00:00Z' },
      { id: 'b', title: 'Keep search filters', nextStep: 'Check Back navigation', project: 'web-client', status: 'ready', notes: [], createdAt: '2026-10-15T10:00:00Z' },
    ]
    if (process.env.POMOGIT_NAV_LONG_PROJECTS === '1') for (let i = 0; i < 24; i++) tasks.push({ ...tasks[1], id: `extra-${i}`, project: `repository-with-a-long-project-name-${i}` })
    await page.route('**/api/**', async route => {
      const request = route.request(), path = new URL(request.url()).pathname
      if (request.method() !== 'GET') { writes.push(path); return route.abort() }
      const data = {
        '/api/auth/me': { user: { id: 'navigation-fixture', email: 'fixture@test.invalid', role: 'user' } },
        '/api/tasks': tasks, '/api/checkpoints': [], '/api/sessions/active': process.env.POMOGIT_NAV_ACTIVE_FOCUS === '1' ? { id: 'focus', taskId: 'a', status: 'active', deadlineAt: new Date(Date.now() + 3600000).toISOString(), durationPlannedSeconds: 3600 } : null,
        '/api/sessions': [], '/api/export': { focusSessions: [] }, '/api/github/projects': [],
      }
      assert(Object.hasOwn(data, path), `Unexpected request ${path}`)
      await route.fulfill({ json: data[path] })
    })
    const check = (label, result) => { assert(result, `${width}/${navigation}/${brightness}: ${label}`); checks++ }
    await page.goto(`${base}/#tasks`)
    await page.locator('.wb-board-card').first().waitFor()
    const geometry = await page.evaluate(() => {
      const nav = document.querySelector('.wb-topbar').getBoundingClientRect(), main = document.querySelector('.wb-main').getBoundingClientRect()
      return {
        overflow: document.documentElement.scrollWidth > innerWidth,
        buttonsOutside: [...document.querySelectorAll('.wb-topbar button,.wb-topbar summary')].some(e => { const r = e.getBoundingClientRect(); return e.closest('nav[aria-label="Projects"],nav[aria-label="More navigation"]') ? false : r.width > 0 && (r.left < nav.left || r.right > nav.right || r.top < nav.top || r.bottom > nav.bottom) }),
        overlap: !(nav.right <= main.left || nav.left >= main.right || nav.bottom <= main.top || nav.top >= main.bottom),
        sameCanvas: getComputedStyle(document.querySelector('.premium-app')).backgroundColor === getComputedStyle(document.querySelector('.wb-main')).backgroundColor,
      }
    })
    if (geometry.overflow || geometry.buttonsOutside || geometry.overlap) { await page.screenshot({ path: `${output}/layout-failure.png` }); console.log(geometry) }
    check('Navigation and content fit without overlap', !geometry.overflow && !geometry.buttonsOutside && !geometry.overlap)
    if (process.env.POMOGIT_NAV_ACTIVE_FOCUS === '1') check('Timer stays clear of navigation', await page.locator('.wb-focus').evaluate(e => { const t = e.getBoundingClientRect(), n = document.querySelector('.wb-topbar').getBoundingClientRect(); return t.top >= 0 && (t.right <= n.left || t.left >= n.right || t.bottom <= n.top || t.top >= n.bottom) }))
    check('Content uses the same background canvas', geometry.sameCanvas)
    check('Selected page has a visible filled control', await page.locator('.wb-page-links [aria-current=page]').evaluate(e => getComputedStyle(e).backgroundColor !== 'rgba(0, 0, 0, 0)'))
    check('Avatar has a complete painted pattern', await page.locator('.wb-nav-profile canvas').evaluate(canvas => canvas.getContext('2d').getImageData(0, 0, 32, 32).data.filter((_, i) => i % 4 === 3).filter(alpha => alpha > 0).length > 100))
    for (const [label, hash] of [['Home', '#home'], ['Workspace', '#work'], ['Board', '#tasks'], ['Activity', '#review']]) {
      await page.getByRole('navigation', { name: 'Workspace pages', exact: true }).getByRole('button', { name: label, exact: true }).click()
      check(`${label} has the correct route and indicator`, new URL(page.url()).hash === hash && await page.locator('.wb-page-links [aria-current=page]').textContent() === label)
    }
    if (width <= 760) await page.locator('.wb-more-menu > summary').click()
    else await page.locator('.wb-project-menu > summary').click()
    const menu = page.locator(width <= 760 ? '.wb-more-menu nav' : '.wb-project-menu nav')
    check('Project menu fits the viewport', await menu.evaluate(e => { const r = e.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight }))
    await menu.getByRole('button', { name: 'web-client', exact: true }).click()
    check('Project opens a filtered Board', new URL(page.url()).hash === '#tasks' && await page.locator('select[aria-label="Filter by project"]').inputValue() === 'web-client')
    if (width <= 760) { await page.locator('.wb-more-menu > summary').click(); await page.locator('.wb-more-menu nav').getByRole('button', { name: 'Profile', exact: true }).click() }
    else await page.locator('.wb-nav-profile').click()
    check('Profile opens', new URL(page.url()).hash === '#profile')
    if (width <= 760) check('More identifies the current Profile section', await page.locator('.wb-more-menu > summary').getAttribute('data-current') === 'true')
    if (width <= 760) { await page.locator('.wb-more-menu > summary').click(); await page.locator('.wb-more-menu nav').getByRole('button', { name: 'Settings', exact: true }).click() }
    else await page.locator('.wb-nav-settings').click()
    await page.getByRole('dialog').waitFor()
    await page.locator(`input[name=navigation][value=${navigation === 'sidebar' ? 'navbar' : 'sidebar'}]`).check()
    await page.getByRole('button', { name: 'Save settings', exact: true }).click()
    check('Settings switches navigation without changing page', await page.locator('.premium-app').getAttribute('data-navigation') !== navigation && new URL(page.url()).hash === '#profile')
    await page.reload(); await page.locator('.wb-nav-profile canvas').waitFor({ state: 'attached' })
    check('Navigation choice persists after reload', await page.locator('.premium-app').getAttribute('data-navigation') !== navigation)
    await page.locator('.wb-more-menu > summary').click()
    check('Logout remains available', await page.locator('.wb-more-menu nav').getByRole('button', { name: 'Log out', exact: true }).isVisible())
    await page.keyboard.press('Escape')
    check('Escape closes menu and restores trigger focus', !await page.locator('.wb-more-menu').evaluate(e => e.open) && await page.locator('.wb-more-menu > summary').evaluate(e => e === document.activeElement))
    await page.goto(`${base}/#tasks`); await page.locator('.wb-board-card').first().waitFor()
    // Return to initial layout for review images.
    await page.evaluate(({ navigation }) => { const key = 'pomogit.work-protocol:navigation-fixture'; localStorage.setItem(key, JSON.stringify({ ...JSON.parse(localStorage.getItem(key)), navigation })) }, { navigation })
    await page.reload(); await page.locator('.wb-board-card').first().waitFor()
    if ([1440, 390].includes(width)) await page.screenshot({ path: `${output}/${navigation}-${brightness}-${width}.png` })
    check('Navigation makes no writes or browser errors', !writes.length && !errors.length)
    await context.close()
    console.log(`PASS ${width}px ${navigation} ${brightness}`)
  }
  console.log(`${checks} floating navigation checks passed`)
} finally { await browser.close() }
