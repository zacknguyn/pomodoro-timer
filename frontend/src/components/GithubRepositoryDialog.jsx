import { useEffect, useRef, useState } from 'react'
import { Github, ArrowRight, GitBranch, Search, Check, Trash2 } from 'lucide-react'
import { githubApi } from '../lib/workApi'
import { Modal } from './WorkbenchPanels'

export default function GithubRepositoryDialog({ projects, projectNames, tasks, onClose, onConnected, onImported, onRemoved }) {
  const [repositories, setRepositories] = useState([])
  const [repositoryPage, setRepositoryPage] = useState(1)
  const [moreRepositories, setMoreRepositories] = useState(false)
  const [needsGithub, setNeedsGithub] = useState(false)
  const [project, setProject] = useState(null)
  const [issues, setIssues] = useState([])
  const [issuePage, setIssuePage] = useState(1)
  const [moreIssues, setMoreIssues] = useState(false)
  const [selected, setSelected] = useState([])
  const [busy, setBusy] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [removing, setRemoving] = useState(null)
  const cancelRemove = useRef(null)
  useEffect(() => { if (removing) cancelRemove.current?.focus() }, [removing])
  useEffect(() => {
    let active = true
    githubApi.repositories().then(data => {
      if (active) { setRepositories(data.repositories); setMoreRepositories(data.hasMore); setNeedsGithub(data.needsGithub) }
    }).catch(failure => { if (active) setError(failure.message) }).finally(() => { if (active) setInitialLoading(false) })
    return () => { active = false }
  }, [])
  async function run(action) {
    if (busy) return
    setBusy(true); setError('')
    try { await action() } catch (failure) { setError(failure.message) } finally { setBusy(false) }
  }
  async function showIssues(next) {
    const data = await githubApi.issues(next.id)
    setIssues(data.issues); setMoreIssues(data.hasMore); setIssuePage(1); setSelected([]); setProject(next)
  }
  async function connect(value) {
    const next = await githubApi.connect(value)
    onConnected(next)
    setProject(next); setIssues([]); setSelected([]); setMoreIssues(false); setIssuePage(1)
    await showIssues(next)
  }
  const available = repositories.filter(repo => !projects.some(item => item.fullName === repo.fullName))
  const close = () => { if (!busy) onClose() }
  if (removing) return <Modal title="Remove project?" onClose={() => { if (!busy) { setRemoving(null); setError('') } }} footer={<><button ref={cancelRemove} disabled={busy} onClick={() => { setRemoving(null); setError('') }}>Cancel</button><button className="wb-danger-solid" disabled={busy} onClick={() => run(async () => { const result = await githubApi.removeProject(removing); await onRemoved(removing, result); setProject(null); setRemoving(null) })}>{busy ? 'Removing…' : 'Remove project'}</button></>}>
    <h3>{removing}</h3><p>Remove this project from your workspace and clear its label from {tasks.filter(task => task.project === removing).length} tasks.</p><p>Your tasks, notes, references, and timer history stay. GitHub stays unchanged. You can reconnect the repository later.</p>{error && <p role="alert" className="wb-error">{error}</p>}
  </Modal>
  return <Modal wide title={project ? 'Import GitHub issues' : 'GitHub repositories'} onClose={close} footer={<>
    <button onClick={close} disabled={busy}>{project ? 'Done' : 'Cancel'}</button>
    {project && <button className="wb-primary" disabled={busy || !selected.length} onClick={() => run(async () => {
      const result = await githubApi.importIssues(project.id, selected)
      await onImported(project, result)
    })}>{busy ? 'Working…' : `Import ${selected.length || ''} selected into Inbox`}</button>}
  </>}>
    <div className="wb-repo-intro"><ol aria-label="Repository connection steps"><li aria-current={!project ? 'step' : undefined}><span>{project ? <Check size={12} /> : '1'}</span>Repository</li><li aria-current={project ? 'step' : undefined}><span>2</span>Choose issues</li></ol><p>Bring selected issues into your board. Your GitHub repository stays unchanged.</p></div>
    {project ? <>
      <div className="wb-repo-context"><div className="wb-github-heading"><GitBranch size={18} /><div><small>Connected repository</small><strong>{project.fullName}</strong></div></div><button className="wb-ghost" disabled={busy} onClick={() => { setProject(null); setSelected([]); setError('') }}>Change repository</button></div>
      <div className="wb-repo-section-heading"><h3>Open issues</h3><span role="status">{selected.length} selected · up to 20</span></div>
      {!issues.length && <p>{busy ? 'Loading issues…' : 'No open issues on this page. You can still create tasks under this project.'}</p>}
      <div className="wb-github-list">{issues.map(issue => <label className="wb-github-issue" key={issue.number}>
        <input type="checkbox" disabled={busy || issue.imported || (selected.length >= 20 && !selected.includes(issue.number))} checked={selected.includes(issue.number)} onChange={event => setSelected(event.target.checked ? [...selected, issue.number] : selected.filter(number => number !== issue.number))} />
        <span><strong>{issue.title}</strong><small>#{issue.number} · {issue.imported ? 'Already imported' : 'Open issue'}</small></span>
      </label>)}</div>
      <p className="wb-muted">Choose up to 20 issues per import. Already imported issues are excluded.</p>
      {moreIssues && <button disabled={busy} onClick={() => run(async () => {
        const data = await githubApi.issues(project.id, issuePage + 1)
        setIssues([...issues, ...data.issues]); setIssuePage(issuePage + 1); setMoreIssues(data.hasMore)
      })}>Load more issues</button>}
    </> : <div className="wb-repo-picker">
      <section className="wb-repo-url"><h3>Connect by URL</h3><p className="wb-muted">Any public repository, including ones outside your account.</p>
      <form className="wb-form" onSubmit={event => { event.preventDefault(); const value = new FormData(event.currentTarget).get('repository'); void run(() => connect(value)) }}>
        <label>Repository URL or owner/repository<input name="repository" placeholder="github.com/owner/repository" required disabled={busy} /></label>
        <button className="wb-primary" disabled={busy}>{busy ? 'Connecting…' : 'Connect repository'}<ArrowRight size={16} /></button>
      </form></section>
      {projectNames.length > 0 && <section><div className="wb-repo-section-heading"><h3>Your projects</h3><span>{projectNames.length} {projectNames.length === 1 ? 'project' : 'projects'}</span></div><div className="wb-github-list">{projectNames.map(name => {
        const connected = projects.find(item => item.fullName === name)
        const count = tasks.filter(task => task.project === name).length
        return <div className="wb-repo-project" key={name}><GitBranch size={17} /><div><strong>{name}</strong><small>{connected ? 'GitHub connected' : 'Local project'} · {count} {count === 1 ? 'task' : 'tasks'}</small></div>{connected && <button disabled={busy} onClick={() => run(() => showIssues(connected))} aria-label={`Import issues from ${name}`}><ArrowRight size={16} /><span>Issues</span></button>}<button className="wb-danger wb-ghost" aria-label={`Remove project ${name}`} title="Remove project" disabled={busy} onClick={() => { setError(''); setRemoving(name) }}><Trash2 size={17} /></button></div>
      })}</div></section>}
      <section><div className="wb-repo-section-heading"><h3>Your public repositories</h3><span>Public access</span></div>
        {!needsGithub && repositories.length > 0 && <label className="wb-repo-search"><Search size={16} /><input aria-label="Search repositories" placeholder="Find a repository…" value={query} onChange={event => setQuery(event.target.value)} /></label>}
        {initialLoading ? <p role="status">Loading repositories…</p> : needsGithub ? <p className="wb-muted">Sign in with GitHub to browse your repositories, or paste any public repository URL above.</p> : !repositories.length && !error ? <p className="wb-muted">No public repositories found. Paste a repository URL above.</p> : null}
        <div className="wb-github-list">{available.filter(repo => repo.fullName.toLowerCase().includes(query.toLowerCase())).map(repo => <button key={repo.githubId} disabled={busy} onClick={() => run(() => connect(repo.fullName))}><Github size={18} /><span><strong>{repo.fullName}</strong>{repo.description && <small>{repo.description}</small>}</span><ArrowRight size={16} /></button>)}</div>
        {!initialLoading && !needsGithub && repositories.length > 0 && !available.length && !query && <p className="wb-muted">All loaded repositories are connected. Paste another URL or load more repositories.</p>}
        {query && !available.some(repo => repo.fullName.toLowerCase().includes(query.toLowerCase())) && <p className="wb-muted">No loaded repositories match “{query}”. Try another name or paste a URL.</p>}
        {moreRepositories && <button disabled={busy} onClick={() => run(async () => {
          const data = await githubApi.repositories(repositoryPage + 1)
          setRepositories([...repositories, ...data.repositories]); setRepositoryPage(repositoryPage + 1); setMoreRepositories(data.hasMore)
        })}>Load more repositories</button>}
      </section>
    </div>}
    {error && <p role="alert" className="wb-error">{error}</p>}
    {error && project && !issues.length && <button disabled={busy} onClick={() => run(() => showIssues(project))}>Retry loading issues</button>}
  </Modal>
}
