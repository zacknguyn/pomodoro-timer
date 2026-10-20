// Loopback preview server. Only public design assets and frontend/public are served.
import { createServer } from 'node:http'
import { readFile, realpath, mkdtemp } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))
const port = Number(process.argv[2] || 5199)
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw Error('Use a port from 1024 to 65535.')
const require = createRequire(path.join(root, 'frontend/package.json'))
const { build } = require('esbuild')
const temporary = await mkdtemp(path.join(tmpdir(), 'pomogit-sidebar-'))
const bundle = path.join(temporary, 'dashboard-kit.js')
await build({
  entryPoints: [path.join(root, 'design/dashboard-preview-kit.jsx')], outfile: bundle,
  bundle: true, minify: true, jsx: 'automatic',
  nodePaths: [path.join(root, 'frontend/node_modules')],
  define: { 'process.env.NODE_ENV': '"production"' },
})
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ttf': 'font/ttf', '.woff2': 'font/woff2' }
createServer(async (req, res) => {
  try {
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return }
    const pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname)
    if (pathname === '/') { res.writeHead(302, { Location: '/design/floating-sidebar-preview.html' }); res.end(); return }
    let file
    if (pathname === '/design/dashboard-kit.js') file = bundle
    else {
      const match = pathname.match(/^\/(design|frontend\/public)\/(.+)$/)
      if (!match || match[2].split('/').some(part => part.startsWith('.'))) throw Error('Not a public asset')
      if (match[1] === 'design' && match[2].includes('/') && !/^(assets|fonts|profile-review|dashboard-preview-kit)\//.test(match[2])) throw Error('Not a public directory')
      const base = path.join(root, match[1])
      file = await realpath(path.resolve(base, match[2]))
      if (!file.startsWith(base + path.sep)) throw Error('Outside public directory')
    }
    const type = types[path.extname(file)]
    if (!type) throw Error('Not a public file type')
    const body = await readFile(file)
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' })
    res.end(req.method === 'HEAD' ? undefined : body)
  } catch { res.writeHead(404); res.end() }
}).listen(port, '127.0.0.1', () => console.log(`Floating sidebar preview: http://127.0.0.1:${port}/design/floating-sidebar-preview.html`))
