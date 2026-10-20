// React account-mode checks. Every API request is intercepted; no account data is accessed.
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from './browser.mjs'
const output = process.env.POMOGIT_PROJECTS_OUTPUT || '/tmp/pomogit-projects-integration'
await mkdir(output, { recursive: true })
const browser = await chromium.launch(), checks = []
try {
  for (const theme of ['light', 'dark']) for (const width of [1440, 375]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme })
    const page = await context.newPage(), errors = []
    page.on('pageerror', error => errors.push(error.message))
    let projects = [{ id: 'api', fullName: 'demo/api' }, { id: 'empty', fullName: 'demo/empty' }]
    let tasks = ['demo/api', 'Personal'].map((project, i) => ({ id: `task-${i}`, project, title: `Task ${i}`, status: 'inbox', nextStep: '', referenceUrl: '', notes: [], createdAt: new Date().toISOString(), order: i }))
    let mode = 'empty', failRemoval = false, issueCalls = 0
    const check = (name, value) => { assert(value, name); checks.push({ width, theme, name }); console.log(`PASS ${theme} ${width}: ${name}`) }
    await page.route('**/api/**', async route => {
      const url = new URL(route.request().url()), path = url.pathname, method = route.request().method()
      let response
      if (method === 'GET' && path.endsWith('/issues')) {
        issueCalls++
        if (mode === 'error') return route.fulfill({ status: 503, json: { error: 'Fixture issue loading failed' } })
        const second = Number(url.searchParams.get('page')) > 1
        response = mode === 'empty' ? { issues: [], hasMore: false } : mode === 'page' && !second ? { issues: [], hasMore: true } : { issues: [{ number: 7, title: 'An imported issue', imported: true }], hasMore: mode === 'imported-more' && !second }
      } else if (method === 'GET') {
        const responses = {
          '/api/auth/me': { user: { id: 'projects-fixture', email: 'fixture@test.invalid', role: 'user' } },
          '/api/tasks': tasks, '/api/checkpoints': [], '/api/sessions/active': null,
          '/api/sessions': [], '/api/export': { tasks, focusSessions: [], checkpoints: [] },
          '/api/github/projects': projects,
          '/api/github/repositories': { repositories: [], needsGithub: false, hasMore: false },
        }
        assert(Object.hasOwn(responses, path), `Unexpected GET ${path}`)
        response = responses[path]
      } else if (method === 'DELETE' && path === '/api/tasks/projects') {
        if (failRemoval) return route.fulfill({ status: 503, json: { error: 'Fixture removal failed' } })
        const { name } = route.request().postDataJSON()
        const updatedTasks = tasks.filter(task => task.project === name).map(task => ({ ...task, project: '' }))
        tasks = tasks.map(task => updatedTasks.find(updated => updated.id === task.id) || task)
        projects = projects.filter(project => project.fullName !== name)
        response = { tasksKept: updatedTasks.length }
      } else throw new Error(`Unexpected fixture mutation ${method} ${path}`)
      await route.fulfill({ json: response })
    })
    await page.goto(`${process.env.POMOGIT_APP_URL || 'http://127.0.0.1:5191'}/#tasks`)
    const open = async () => { await page.getByRole('button', { name: 'Manage projects', exact: true }).click(); await page.getByRole('dialog', { name: 'Projects & repositories', exact: true }).waitFor() }
    const back = () => page.locator('.wb-modal footer').getByRole('button', { name: 'Back to projects', exact: true }).click()
    const issues = async (name = 'demo/empty') => { await page.getByRole('button', { name: `Import issues from ${name}`, exact: true }).click(); await page.getByRole('dialog', { name: 'Import more issues', exact: true }).waitFor(); await page.getByText('Loading issues…', { exact: true }).waitFor({ state: 'hidden' }) }
    await open()
    check('Existing projects precede collapsed connection controls', await page.locator('.wb-repo-project').count() === 3 && !await page.locator('.wb-repo-connect').evaluate(e => e.open))
    check('Connected and local projects have distinct types and icons', await page.locator('.wb-repo-project .lucide-github').count() === 2 && await page.locator('.wb-repo-project .lucide-folder').count() === 1 && await page.locator('.wb-repo-project').filter({ hasText: 'Local project' }).count() === 1)
    check('Project rows and footer fit viewport', await page.locator('.wb-modal').evaluate(e => e.scrollWidth <= e.clientWidth + 1 && e.getBoundingClientRect().right <= innerWidth) && await page.locator('.wb-modal footer').evaluate(e => e.scrollWidth <= e.clientWidth + 1))
    await page.screenshot({ path: `${output}/projects-${width}-${theme}.png` })
    await page.locator('.wb-repo-connect summary').click()
    check('Connection controls expand on demand', await page.locator('[name=repository]').isVisible())
    await issues()
    check('Empty repository explains retained connection and manual tasks', /still connected/.test(await page.locator('.wb-modal').textContent()) && /task editor/.test(await page.locator('.wb-modal').textContent()))
    await page.screenshot({ path: `${output}/empty-${width}-${theme}.png` })
    await page.getByRole('button', { name: 'View project tasks', exact: true }).click()
    check('Empty project opens filtered Board', page.url().endsWith('#tasks') && await page.locator('[aria-label="Filter by project"]').inputValue() === 'demo/empty')
    await open(); mode = 'page'; await issues()
    check('Empty first page preserves pagination', await page.getByRole('button', { name: 'Load more issues', exact: true }).isVisible() && await page.getByRole('button', { name: 'View project tasks', exact: true }).count() === 0)
    await page.getByRole('button', { name: 'Load more issues', exact: true }).click()
    await page.getByRole('button', { name: 'View project tasks', exact: true }).waitFor()
    check('Later page renders imported issues with disabled selection', await page.locator('.wb-github-issue input').isDisabled())
    await back(); mode = 'imported-more'; await issues('demo/api')
    check('Imported page explains loading more before viewing tasks', /Load more issues to check for new work/.test(await page.locator('.wb-modal').textContent()) && await page.getByRole('button', { name: 'View project tasks', exact: true }).count() === 0)
    await back(); mode = 'error'; await issues()
    await page.getByRole('button', { name: 'Retry loading issues', exact: true }).waitFor()
    check('Issue failure stays with selected repository and hides empty success copy', /demo\/empty/.test(await page.locator('.wb-repo-context').textContent()) && !/No open issues to import/.test(await page.locator('.wb-modal').textContent()))
    mode = 'empty'; const before = issueCalls
    await page.getByRole('button', { name: 'Retry loading issues', exact: true }).click()
    await page.getByRole('button', { name: 'View project tasks', exact: true }).waitFor()
    check('Retry loads selected repository', issueCalls === before + 1 && await page.getByRole('alert').count() === 0)
    await back()
    await page.getByRole('button', { name: 'View tasks', exact: true }).click()
    check('Local project action filters Board', await page.locator('[aria-label="Filter by project"]').inputValue() === 'Personal' && await page.locator('.wb-card-title').count() === 1)
    await open()
    await page.getByRole('button', { name: 'Remove project demo/api', exact: true }).click()
    check('Removal explains retained task history and unchanged GitHub', /timer history stay/.test(await page.locator('.wb-modal').textContent()) && /GitHub stays unchanged/.test(await page.locator('.wb-modal').textContent()))
    await page.getByRole('button', { name: 'Cancel', exact: true }).click()
    check('Cancel retains project and task label', projects.length === 2 && tasks[0].project === 'demo/api')
    await page.getByRole('button', { name: 'Remove project demo/api', exact: true }).click()
    failRemoval = true
    await page.getByRole('button', { name: 'Remove project', exact: true }).click()
    await page.getByRole('alert').waitFor()
    check('Failed removal keeps confirmation and data', projects.length === 2 && tasks[0].project === 'demo/api' && await page.getByRole('dialog', { name: 'Remove project?', exact: true }).isVisible())
    failRemoval = false
    await page.getByRole('button', { name: 'Remove project', exact: true }).click()
    await page.getByRole('dialog', { name: 'Projects & repositories', exact: true }).waitFor()
    check('Removing connected project retains tasks and clears its label', projects.length === 1 && tasks.length === 2 && tasks[0].project === '' && await page.getByRole('button', { name: 'Remove project demo/api', exact: true }).count() === 0)
    await page.getByRole('button', { name: 'Remove project Personal', exact: true }).click()
    check('Local removal copy describes reusing project name', /use this project name again/.test(await page.locator('.wb-modal').textContent()))
    await page.getByRole('button', { name: 'Remove project', exact: true }).click()
    await page.getByRole('dialog', { name: 'Projects & repositories', exact: true }).waitFor()
    check('Removing local project keeps tasks and clears label', tasks.length === 2 && tasks[1].project === '')
    check('No browser errors', errors.length === 0)
    await context.close()
  }
  await writeFile(`${output}/results.json`, JSON.stringify(checks, null, 2))
  console.log(`${checks.length} React project checks passed. Evidence: ${output}`)
} finally { await browser.close() }
