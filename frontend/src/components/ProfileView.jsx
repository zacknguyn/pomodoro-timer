import { useEffect, useState } from 'react'
import { ArrowRight, Save } from 'lucide-react'
import { DitherButton } from './dither-kit/DitherButton'
import { DitherGradient } from './dither-kit/DitherGradient'
import { DitherAvatar } from './dither-kit/DitherAvatar'
import { workApi } from '../lib/workApi'
import { writeProfile } from '../lib/preferences'

function formatProofDate(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(value))
}

export default function ProfileView({ user, localPreview, profile, onProfile, onOpenReview }) {
  const [draft, setDraft] = useState(profile)
  const [proof, setProof] = useState([])
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let active = true
    workApi.listReviewEntries()
      .then((entries) => { if (active) setProof(entries.slice(0, 3)) })
      .catch(() => { if (active) setProof([]) })
    return () => { active = false }
  }, [])

  function savePreferences(event) {
    event.preventDefault()
    const nextProfile = {
      displayName: draft.displayName.trim() || 'Local maker',
      headline: draft.headline.trim() || 'Shipping one meaningful change at a time.',
    }
    writeProfile(localStorage, nextProfile)
    onProfile(nextProfile)
    setDraft(nextProfile)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1800)
  }

  return (
    <div className="profile-view">
      <section className="profile-masthead" aria-labelledby="profile-heading">
        <DitherGradient from="blue" to="transparent" direction="right" cell={3} opacity={0.28} bloom="off" className="profile-texture" />
        <DitherAvatar className="profile-identity-mark" name={draft.displayName || user?.email || 'Pomogit'} bloom="aura" />
        <div className="profile-identity">
          <p className="section-kicker">Maker profile</p>
          <h1 id="profile-heading">{profile.displayName}</h1>
          <p>{profile.headline}</p>
        </div>
        <dl className="profile-account-stamp">
          <div><dt>Workspace</dt><dd>{localPreview ? 'Local preview' : 'Private account'}</dd></div>
          <div><dt>Identity</dt><dd>{localPreview ? 'Browser only' : user?.email}</dd></div>
        </dl>
      </section>

      <div className="profile-layout">
        <form className="profile-editor" onSubmit={savePreferences}>
          <header><p className="section-kicker">Identity</p><h2>How your workspace addresses you</h2></header>
          <label><span>Display name</span><input value={draft.displayName} onChange={(event) => setDraft((current) => ({ ...current, displayName: event.target.value }))} maxLength={80} /></label>
          <label><span>Working line</span><textarea value={draft.headline} onChange={(event) => setDraft((current) => ({ ...current, headline: event.target.value }))} maxLength={180} rows={3} /></label>

          <DitherButton type="submit"><Save size={16} aria-hidden="true" /> {saved ? 'Saved' : 'Save profile'}</DitherButton>
        </form>

        <aside className="profile-rail">
          <section className="profile-proof" aria-labelledby="proof-heading">
            <header><div><p className="section-kicker">Recent proof</p><h2 id="proof-heading">What you moved</h2></div><button type="button" onClick={onOpenReview}>Open Review <ArrowRight size={14} /></button></header>
            {proof.length === 0 ? <p className="profile-empty-proof">Your latest checkpoints will live here after the first session.</p> : (
              <ol>{proof.map((entry) => <li key={entry.id}><time dateTime={entry.createdAt}>{formatProofDate(entry.createdAt)}</time><strong>{entry.task.title}</strong><p>{entry.whatChanged || entry.nextStep || 'Checkpoint saved.'}</p></li>)}</ol>
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}
