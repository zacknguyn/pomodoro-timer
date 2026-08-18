import { DitherGradient } from './dither-kit/DitherGradient'

const COPY = {
  work: ['Execute', 'Work', 'Finding the next clear move.'],
  tasks: ['Organize', 'Tasks', 'Loading captured and ready work.'],
  review: ['Recover', 'Review', 'Rebuilding the checkpoint trail.'],
  profile: ['Identity', 'Profile', 'Loading your workspace identity.'],
  admin: ['Control', 'Admin', 'Loading workspace operations.'],
}

export default function WorkspaceRouteSkeleton({ view }) {
  const [kicker, title, message] = COPY[view] || COPY.work
  return (
    <div className={`route-skeleton is-${view}`} aria-busy="true" aria-label={`Loading ${title}`}>
      <header><p className="page-kicker">{kicker}</p><h1>{title}</h1><p>{message}</p></header>
      <section>
        <DitherGradient from="grey" to="transparent" direction="right" cell={3} opacity={0.16} bloom="off" />
        {view === 'profile' && <span className="route-skeleton-avatar" />}
        <div className="route-skeleton-copy"><span /><span /><span /></div>
      </section>
      <div className="route-skeleton-rows"><span /><span /><span /></div>
    </div>
  )
}
