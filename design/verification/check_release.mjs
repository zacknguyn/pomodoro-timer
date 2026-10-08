// Production smoke test using an existing Playwright installation and Chromium.
// npm run build && npm run preview -- --host 127.0.0.1 --port 5181
// POMOGIT_PLAYWRIGHT_MODULE=/path/to/playwright node design/verification/check_release.mjs
// Optional: POMOGIT_APP_URL, POMOGIT_CHROMIUM, POMOGIT_RELEASE_OUTPUT.
// All browser data and downloaded exports belong to isolated test contexts.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const { chromium } = createRequire(import.meta.url)(process.env.POMOGIT_PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.POMOGIT_APP_URL || 'http://127.0.0.1:5181'
const output = process.env.POMOGIT_RELEASE_OUTPUT || '/tmp/pomogit-release-chromium'
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ executablePath: process.env.POMOGIT_CHROMIUM || undefined })
const cases = []
try {
  for (const mobile of [false, true]) {
    const width = mobile ? 390 : 1440
    const context = await browser.newContext({ viewport: { width, height: 900 }, isMobile: mobile, hasTouch: mobile, acceptDownloads: true })
    const page = await context.newPage()
    const errors = [], requests = [], responses = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('request', request => requests.push(new URL(request.url()).pathname))
    page.on('response', response => { if (response.status() >= 400) responses.push([response.status(), response.url()]) })
    const check = async (name, test) => { assert(await test(), name); cases.push({ width, name }); console.log(`PASS ${width}: ${name}`) }
    const ready = async route => {
      await page.locator(['landing','login','register','recover'].includes(route) ? '.pg-public' : '.wb-heading').waitFor()
      await page.locator('.wb-loading').waitFor({ state: 'hidden' })
      await page.waitForTimeout(250)
    }
    const load = async route => { await page.goto(`${base}/?release=${Date.now()}#${route}`); await ready(route) }
    const reload = async () => { const route = new URL(page.url()).hash.slice(1); await page.reload(); await ready(route) }
    const use = async selector => {
      const element = page.locator(selector)
      await element.scrollIntoViewIfNeeded()
      if (mobile) await element.tap(); else await element.click()
    }
    const dismiss = async () => { if (await page.locator('[aria-label="Dismiss notification"]').count()) await use('[aria-label="Dismiss notification"]') }
    const settings = async () => { await use('.wb-account-menu summary'); await use('.wb-account-menu nav button:nth-child(2)') }
    await load('work')
    await page.evaluate(() => localStorage.setItem('pomogit.mock.v1', JSON.stringify({ tasks: [], checkpoints: [], sessions: [], session: null, seq: 100 })))
    await load('tasks')
    await check('First task guidance appears', () => page.locator('.wb-board-empty').isVisible())
    await page.keyboard.press('Tab'); await page.keyboard.press('Enter')
    await check('Keyboard skip link focuses content', () => page.evaluate(() => document.activeElement.id === 'wb-main'))
    await page.keyboard.press('n')
    await check('Keyboard capture shortcut focuses title', () => page.evaluate(() => document.activeElement.matches('.wb-capture input')))
    const title = `Release audit task ${width}`
    await page.locator('.wb-capture input').fill(title)
    await use('.wb-capture button')
    await page.locator('.wb-card-title').waitFor()
    await dismiss()
    await use('.wb-card-title'); await use('.wb-modal footer button:first-child')
    await page.locator('[name=project]').fill('release-checks')
    await page.locator('[name=nextStep]').fill('Verify saved work after reopening.')
    await page.locator('[name=referenceUrl]').fill('https://example.com/pull/123')
    await page.locator('[name=status]').selectOption('ready')
    await page.locator('[name=note]').fill('Saved production audit context.')
    await use('button[form=wb-edit-task]')
    await page.locator('.wb-modal').waitFor({ state: 'hidden' }); await dismiss()
    await reload()
    await check('Saved task survives reload', () => page.locator('.wb-lane[data-drop=ready] .wb-card-title').isVisible())
    await use('.wb-card-title'); await use('.wb-modal footer .wb-primary')
    await check('Project, next step and note survive reload', () => page.evaluate(() => document.querySelector('.wb-detail').textContent.includes('release-checks') && document.querySelector('.wb-next-step').textContent.includes('reopening') && document.querySelector('.wb-saved-context').textContent.includes('production audit')))
    await use('.wb-detail .wb-actions .wb-primary')
    await reload()
    await check('Active timer and task persist after reload', () => page.evaluate(() => document.querySelector('.wb-focus').dataset.running === 'true' && document.querySelector('.wb-detail .wb-status').dataset.status === 'progress'))
    const accessibility = await context.newCDPSession(page)
    const tree = await accessibility.send('Accessibility.getFullAXTree')
    assert(tree.nodes.some(node => node.role?.value === 'timer' && node.name?.value.includes('remaining')), 'Timer absent from browser accessibility tree')
    cases.push({ width, name: 'Timer has a readable name in the browser accessibility tree' })
    await accessibility.detach()
    await use('.wb-focus-actions button:first-child'); await reload()
    await check('Paused timer survives reload', () => page.locator('.wb-focus header small').textContent().then(text => text === 'Paused'))
    await use('.wb-focus-actions button:first-child'); await use('.wb-focus-actions button:last-child'); await dismiss()
    await use('.wb-detail footer button')
    await use('.wb-modal footer button:nth-child(2)')
    await page.locator('#wb-closing-note textarea').fill('Verified the complete production loop.')
    await use('button[form=wb-closing-note]'); await dismiss()
    await load('review')
    await check('Completion note persists in Activity', () => page.locator('.wb-activity').textContent().then(text => text.includes('complete production loop')))
    await settings()
    await page.locator('input[name=palette][value=sage]').check()
    await page.locator('input[name=brightness][value=dark]').check()
    await page.locator('input[name=navigation][value=navbar]').check()
    await page.locator('input[name=motion][value=reduced]').check()
    await page.locator('input[name=focusMinutes][value="45"]').check()
    await use('button[form=wb-settings-form][type=submit]'); await dismiss(); await reload()
    await check('Preferences persist after reload', () => page.evaluate(() => document.documentElement.dataset.palette === 'sage' && document.documentElement.dataset.theme === 'dark' && document.documentElement.dataset.motion === 'reduced' && document.querySelector('.premium-app').dataset.navigation === 'navbar'))
    await settings()
    const downloading = page.waitForEvent('download')
    await page.locator('.wb-settings-data button').first().click()
    const download = await downloading
    const exportFile = path.join(output, `${width}-${download.suggestedFilename()}`)
    await download.saveAs(exportFile)
    const exported = JSON.parse(await readFile(exportFile, 'utf8'))
    assert.equal(exported.tasks.length, 1)
    assert.equal(exported.tasks[0].title, title)
    assert.equal(exported.tasks[0].status, 'done')
    assert.equal(exported.tasks[0].referenceUrl, 'https://example.com/pull/123')
    assert(exported.tasks[0].notes.some(note => note.text.includes('complete production loop')))
    assert(exported.sessions.length > 0 && !exported.session)
    cases.push({ width, name: 'Actual downloaded export preserves saved task, notes and session history' })
    await page.keyboard.press('Escape')
    await check('Settings restores account focus', () => page.evaluate(() => document.activeElement.matches('.wb-account-menu summary')))
    await load('profile'); await use('.wb-profile-toolbar .wb-ghost')
    await page.locator('[name=displayName]').fill('Release maker')
    await page.locator('[name=headline]').fill('Checking the production workspace.')
    await use('.wb-avatar-editor button'); await use('button[form=wb-profile-form]'); await dismiss()
    await use('.wb-featured header button')
    await page.locator('.wb-feature-option input').check()
    await page.locator('.wb-feature-summary textarea').fill('Verified recovery and exported the result.')
    await use('.wb-modal footer .wb-primary'); await dismiss(); await reload()
    await check('Identity and featured work persist after reload', () => page.evaluate(() => document.querySelector('.wb-profile-identity h2').textContent === 'Release maker' && document.querySelector('.wb-featured').textContent.includes('Verified recovery and exported')))
    await use('.wb-profile-toolbar button:last-child')
    await check('Visitor profile keeps private notes out', () => page.evaluate(() => document.querySelector('.wb-profile').textContent.includes('Verified recovery and exported') && !document.querySelector('.wb-profile').textContent.includes('Saved production audit context.')))
    for (const route of ['work', 'tasks', 'review', 'profile', 'landing', 'login', 'register', 'recover']) {
      await load(route)
      await check(`${route} fits viewport`, () => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      await page.screenshot({ path: path.join(output, `${route}-${width}.png`) })
      await page.locator('.pg-public img').evaluateAll(images => Promise.all(images.map(image => new Promise(resolve => {
        image.loading = 'eager'
        if (image.complete) resolve(); else { image.onload = resolve; image.onerror = resolve }
      }))))
      assert(await page.locator('.pg-public img').evaluateAll(images => images.every(image => image.naturalWidth > 0)), `${route} image failed to load`)
    }
    assert.deepEqual(errors, [], 'Browser runtime errors')
    assert.deepEqual(responses, [], 'Failed asset requests')
    assert(!requests.some(url => url.startsWith('/api/')), 'Backend request in UI-only build')
    assert(requests.some(url => url.startsWith('/assets/Workbench-')), 'Production bundle not loaded')
    assert(!requests.some(url => url.startsWith('/src/') || url === '/@vite/client'), 'Development resources in production')
    cases.push({ width, name: 'Bundled assets load without errors, development modules or backend requests' })
    await context.close()
  }
  await writeFile(path.join(output, 'results.json'), JSON.stringify({ browser: browser.version(), cases }, null, 2))
  console.log(`PASS: ${cases.length} production checks. Evidence: ${output}`)
} finally { await browser.close() }
