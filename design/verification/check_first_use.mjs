// Account-mode UI with all API calls intercepted. No backend or GitHub writes.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
const { chromium } = createRequire(import.meta.url)(process.env.POMOGIT_PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.POMOGIT_APP_URL || 'http://127.0.0.1:5191'
const output = process.env.POMOGIT_FIRST_USE_OUTPUT || '/tmp/pomogit-first-use'
await mkdir(output, { recursive: true })
const browser = await chromium.launch()
const checks = [], snapshots = {}
try {
  for (const width of [1440, 375]) for (const navigation of ['sidebar', 'navbar']) {
    const context = await browser.newContext({ viewport: { width, height: 900 } })
    await context.addInitScript(({ navigation }) => { localStorage.setItem('pomogit.work-protocol:first-use-fixture', JSON.stringify({ navigation, brightness: 'light', motion: 'reduced' })) }, { navigation })
    const page = await context.newPage(), errors = []
    page.setDefaultTimeout(15000)
    page.on('pageerror', error => errors.push(error.message))
    let tasks = [], projects = [], session = null
    const project = { id: 'fixture-project', fullName: 'octocat/Hello-World', githubId: 1 }
    const task = { id: 'fixture-task', title: 'Fix callback retry', status: 'inbox', project: project.fullName, nextStep: '', referenceUrl: 'https://github.com/octocat/Hello-World/issues/1', notes: [], createdAt: new Date().toISOString(), order: 0 }
    const check = (name, condition) => { assert(condition, name); checks.push({ width, navigation, name }); console.log(`PASS ${width}/${navigation}: ${name}`) }
    await page.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname, method = route.request().method()
      const data = route.request().postDataJSON()
      let response
      if (method === 'GET') {
        const responses = {
          '/api/auth/me': { user: { id: 'first-use-fixture', email: 'fixture@test.invalid', role: 'user' } },
          '/api/tasks': tasks, '/api/checkpoints': [], '/api/sessions/active': session,
          '/api/export': { tasks, focusSessions: [], checkpoints: [] },
          '/api/github/projects': projects,
          '/api/github/repositories': { needsGithub: false, repositories: [project], hasMore: false },
          '/api/github/projects/fixture-project/issues': { issues: [{ number: 1, title: task.title, imported: tasks.length > 0 }], hasMore: false },
        }
        assert(Object.hasOwn(responses, path), `Unexpected fixture request: ${path}`)
        response = responses[path]
      } else if (path === '/api/github/projects' && method === 'POST') {
        projects = [project]; response = project
      } else if (path === '/api/tasks' && method === 'POST') {
        tasks = [{ ...task, ...data, notes: [] }]; response = tasks[0]
      } else if (path === '/api/tasks/fixture-task' && method === 'DELETE') {
        tasks = []; response = null
      } else if (path === '/api/github/projects/fixture-project/import' && method === 'POST') {
        assert.deepEqual(data.numbers, [1]); tasks = [{ ...task }]; response = { imported: 1, skipped: 0 }
      } else if (path === '/api/sessions' && method === 'POST') {
        tasks[0].status = 'progress'
        session = { id: 'fixture-session', taskId: task.id, status: 'active', startedAt: new Date().toISOString(), durationPlannedSeconds: data.durationPlannedSeconds, remainingSeconds: data.durationPlannedSeconds, deadlineAt: new Date(Date.now()+data.durationPlannedSeconds*1000).toISOString() }; response = session
      } else if (path === '/api/sessions/fixture-session' && method === 'PATCH') {
        assert.equal(data.action, 'end'); response = { ...session, status: 'completed' }; session = null
      } else if (path === '/api/tasks/fixture-task' && method === 'PATCH') {
        Object.assign(tasks[0], data); response = tasks[0]
      } else throw new Error(`Unexpected fixture mutation: ${method} ${path}`)
      return route.fulfill({ json: response })
    })
    await page.goto(`${base}/#work`)
    await page.locator('.wb-work-empty').waitFor()
    check('Approved empty Workspace groups capture and GitHub choices', await page.locator('.wb-first-use .wb-capture').count() === 1 && await page.locator('.wb-first-use-github').isVisible() && /Choose a task before starting focus/.test(await page.locator('.wb-work-empty').textContent()))
    check('Empty Workspace has one capture form and no empty-screen navigation', await page.locator('.wb-capture').count() === 1 && await page.getByRole('button', { name: 'Back to Board', exact: true }).count() === 0 && await page.locator('.wb-filters').count() === 0)
    check('Capture controls fit without horizontal overflow', await page.locator('.wb-first-use-capture').evaluate(e => e.scrollWidth <= e.clientWidth + 1))
    if (width === 1440) snapshots.empty = await page.locator('.premium-app').evaluate(e => {
      const copy = e.cloneNode(true)
      e.querySelectorAll('canvas').forEach((canvas, index) => {
        const image = document.createElement('img')
        image.src = canvas.toDataURL(); image.width = canvas.width; image.height = canvas.height; image.alt = ''
        copy.querySelectorAll('canvas')[index]?.replaceWith(image)
      })
      return copy.outerHTML
    })
    await page.screenshot({ path: `${output}/empty-${width}.png` })
    await page.getByRole('textbox', { name: 'Task title or reference link', exact: true }).fill('Write my first task')
    await page.getByRole('button', { name: 'Create task', exact: true }).click()
    await page.locator('.wb-detail').waitFor()
    check('First task creation opens Workspace without starting focus', tasks[0].title === 'Write my first task' && tasks[0].status === 'inbox' && session === null)
    check('Populated Workspace restores normal capture and Board navigation', await page.locator('.wb-first-use').count() === 0 && await page.locator('.wb-capture').count() === 1 && await page.getByRole('button', { name: 'Back to Board', exact: true }).isVisible())
    await page.getByRole('button', { name: 'Undo', exact: true }).click()
    await page.locator('.wb-first-use').waitFor()
    check('Undo returns to first-use layout with a cleared capture field', await page.getByRole('textbox', { name: 'Task title or reference link', exact: true }).inputValue() === '')
    check('Notification remains clear of navigation', await page.getByRole('button', { name: 'Dismiss notification', exact: true }).evaluate(e => { const r = e.getBoundingClientRect(), n = document.querySelector('.wb-topbar').getBoundingClientRect(); return r.bottom <= n.top || r.top >= n.bottom || r.right <= n.left || r.left >= n.right })); await page.getByRole('button', { name: 'Dismiss notification', exact: true }).click()
    await page.getByRole('button', { name: /^(Connect GitHub repository|Manage projects)$/ }).click()
    check('Connection explains projects and one-way imports', /create a project/.test(await page.locator('.wb-repo-intro').textContent()) && /not synced/.test(await page.locator('.wb-repo-intro').textContent()))
    if (width === 1440) {
      snapshots.repository = await page.locator('.wb-modal').evaluate(e => e.outerHTML)
      snapshots.styles = await page.locator('style').allTextContents()
    }
    await page.getByRole('button').filter({ hasText: 'octocat/Hello-World' }).click()
    await page.locator('.wb-github-issue').waitFor()
    check('Connecting alone creates a project without tasks', projects.length === 1 && tasks.length === 0)
    check('No selection offers a clear disabled import action', await page.getByRole('button', { name: 'Select issues to import', exact: true }).isDisabled())
    check('Connected project can be kept without importing', /go back to projects without importing/.test(await page.locator('.wb-repo-intro').textContent()))
    if (width === 1440) snapshots.issues = await page.locator('.wb-modal').evaluate(e => e.outerHTML)
    await page.locator('.wb-modal footer').getByRole('button', { name: 'Back to projects', exact: true }).click()
    check('Projects appear first with connection controls collapsed', await page.locator('.wb-repo-project').count() === 1 && !await page.locator('.wb-repo-connect').evaluate(e => e.open))
    await page.getByRole('button', { name: 'Done', exact: true }).click()
    check('Leaving issue picker keeps the project', projects.length === 1 && tasks.length === 0 && await page.locator('.wb-work-empty').isVisible())
    await page.getByRole('button', { name: /^(Connect GitHub repository|Manage projects)$/ }).click()
    await page.getByRole('button', { name: 'Import issues from octocat/Hello-World', exact: true }).click()
    await page.locator('.wb-github-issue input').check()
    await page.getByRole('button', { name: 'Import 1 selected into Inbox', exact: true }).click()
    await page.locator('.wb-card-title').waitFor()
    check('Import opens the project-filtered Board', page.url().endsWith('#tasks') && await page.locator('[aria-label="Filter by project"]').inputValue() === project.fullName && tasks[0].status === 'inbox')
    check('Notification remains clear of navigation', await page.getByRole('button', { name: 'Dismiss notification', exact: true }).evaluate(e => { const r = e.getBoundingClientRect(), n = document.querySelector('.wb-topbar').getBoundingClientRect(); return r.bottom <= n.top || r.top >= n.bottom || r.right <= n.left || r.left >= n.right })); await page.getByRole('button', { name: 'Dismiss notification', exact: true }).click()
    await page.locator('.wb-card-title').click()
    check('Task popup is read-only with separate Edit and Workspace actions', await page.getByRole('button', { name: 'Edit', exact: true }).isVisible() && await page.getByRole('button', { name: 'Work on this', exact: true }).isVisible() && await page.locator('#wb-edit-task').count() === 0)
    await page.getByRole('button', { name: 'Work on this', exact: true }).click()
    check('Opening a task does not start focus', session === null && await page.getByRole('button', { name: 'Start focus', exact: true }).isVisible())
    await page.getByRole('button', { name: 'Start focus', exact: true }).click()
    await page.getByRole('button', { name: 'Stop timer', exact: true }).waitFor()
    check('Starting focus moves task to In progress', tasks[0].status === 'progress' && session?.taskId === task.id)
    await page.getByRole('button', { name: 'Stop timer', exact: true }).click()
    await page.getByRole('button', { name: 'Start focus', exact: true }).waitFor()
    check('Stopping timer keeps the task unfinished', session === null && tasks[0].status === 'progress')
    await page.getByRole('button', { name: 'Mark done', exact: true }).click()
    await page.getByRole('dialog', { name: 'Task completed', exact: true }).waitFor()
    check('Task completion does not require a note', tasks[0].status === 'done' && await page.getByRole('button', { name: 'Add note · optional', exact: true }).isVisible())
    check('Dialog footer fits mobile and desktop', await page.locator('.wb-modal footer').evaluate(e=>e.scrollWidth <= e.clientWidth+1))
    await page.screenshot({ path: `${output}/completed-${width}-${navigation}.png` })
    check('No browser errors', errors.length === 0)
    await context.close()
  }
  await writeFile(`${output}/results.json`, JSON.stringify(checks, null, 2))
  await writeFile(`${output}/snapshots.json`, JSON.stringify(snapshots))
  console.log(`${checks.length} first-use checks passed. Evidence: ${output}`)
} finally { await browser.close() }
