// Stage only review assets; never expose the repository through the preview server.
import {createServer} from 'node:http'
import {copyFile,mkdir,mkdtemp,readFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath,pathToFileURL} from 'node:url'
const repo=fileURLToPath(new URL('../../',import.meta.url)),port=Number(process.argv[2]||5198)
if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('Use a port from 1024 to 65535.')
const stage=await mkdtemp(path.join(tmpdir(),'pomogit-dashboard-')),design=path.join(stage,'design')
await mkdir(design,{recursive:true});await mkdir(path.join(stage,'frontend/public/fonts'),{recursive:true})
for(const name of ['dashboard-preview.html','dashboard-preview.css','dashboard-kit-utilities.css','dashboard-preview.js','workspace-preview.html','workspace-preview.css','workspace-preview.js','workspace-preview-shell.css'])await copyFile(path.join(repo,'design',name),path.join(design,name))
for(const name of ['barlow-400.ttf','barlow-500.ttf','barlow-600.ttf','bricolage-600.ttf'])await copyFile(path.join(repo,'frontend/public/fonts',name),path.join(stage,'frontend/public/fonts',name))
await copyFile(path.join(repo,'frontend/public/pomogit-logo.png'),path.join(stage,'frontend/public/pomogit-logo.png'))
for(const html of ['dashboard-preview.html','workspace-preview.html']){
 const text=await readFile(path.join(design,html),'utf8')
 for(const match of text.matchAll(/src="(profile-review\/[a-zA-Z0-9-]+\.png)"/g)){
  const target=path.join(design,match[1]);await mkdir(path.dirname(target),{recursive:true});await copyFile(path.join(repo,'design',match[1]),target)
 }
}
// The Workspace sample opens ready to work; it does not start focus on navigation.
const {writeFile}=await import('node:fs/promises')
const workspaceJS=path.join(design,'workspace-preview.js')
await writeFile(workspaceJS,(await readFile(workspaceJS,'utf8')).replace('\nreset()',"\nif(params.get('state')==='idle')$('#scenario').value='idle'\nreset()"))
const dependencies=process.env.POMOGIT_DITHER_DEPS||'/tmp/pomogit-dither-defaults/deps/node_modules'
const {access}=await import('node:fs/promises')
try{await access(path.join(dependencies,'motion'))}catch{throw new Error('Preview dependencies missing. Run: npm install --prefix /tmp/pomogit-dither-defaults/deps --no-audit --no-fund --ignore-scripts motion d3-scale d3-shape clsx tailwind-merge')}
const {build}=await import(pathToFileURL(path.join(repo,'frontend/node_modules/esbuild/lib/main.js')).href)
await build({entryPoints:[path.join(repo,'design/dashboard-preview-kit.jsx')],outfile:path.join(design,'dashboard-kit.js'),bundle:true,minify:true,jsx:'automatic',nodePaths:[dependencies,path.join(repo,'frontend/node_modules')],alias:{react:path.join(repo,'frontend/node_modules/react'),'react-dom':path.join(repo,'frontend/node_modules/react-dom')},define:{'process.env.NODE_ENV':'"production"'}})
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.ttf':'font/ttf'}
createServer(async(req,res)=>{
 try{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return}
  const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname)
  if(pathname==='/'){res.writeHead(302,{Location:'/design/dashboard-preview.html'});res.end();return}
  const file=path.resolve(stage,'.'+pathname),type=types[path.extname(file)]
  if(!file.startsWith(stage+path.sep)||!type){res.writeHead(404);res.end();return}
  const body=await readFile(file);res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:body)
 }catch{res.writeHead(404);res.end()}
}).listen(port,'127.0.0.1',()=>console.log(`Dashboard preview: http://127.0.0.1:${port}/design/dashboard-preview.html\nStaged public assets: ${stage}`))
