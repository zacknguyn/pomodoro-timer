import { ArrowRight } from 'lucide-react'
import { DitherButton } from './dither-kit/DitherButton'
import { DitherGradient } from './dither-kit/DitherGradient'

function WorkPreview() {
  return (
    <div className="landing-preview" role="img" aria-label="Preview of the Pomogit Work screen">
      <div className="preview-rail">
        <span className="preview-brand"><img src="/pomogit-logo.png" alt="" /> Pomogit</span>
        <span className="preview-nav is-active">Work</span>
        <span className="preview-nav">Settings</span>
      </div>
      <div className="preview-stage">
        <header><span>Workspace / Work</span><strong>Work</strong></header>
        <div className="preview-now">
          <DitherGradient from="blue" to="transparent" direction="right" cell={3} opacity={0.44} bloom="off" />
          <span>NOW · RESUME FROM HERE</span>
          <strong>Finish the retry path</strong>
          <small>Next: Add the regression test and open the PR.</small>
          <i>Continue task →</i>
        </div>
        <div className="preview-ready"><span>UP NEXT</span><strong>Ready</strong><b>3</b></div>
        <div className="preview-row"><em>02</em><span>Add callback timeout coverage</span></div>
        <div className="preview-row"><em>03</em><span>Document the recovery behavior</span></div>
      </div>
    </div>
  )
}

export default function LandingScreen({ onOpen }) {
  return (
    <main className="landing-screen">
      <header className="landing-brand"><img src="/pomogit-logo.png" alt="" /><strong>Pomogit</strong></header>
      <section className="landing-copy" aria-labelledby="landing-title">
        <p className="section-kicker">Checkpoint-based focus</p>
        <h1 id="landing-title">Pick up where<br />you left off.</h1>
        <p>Pomogit helps solo developers focus on one task, record what changed, and return without rebuilding context.</p>
        <DitherButton className="landing-open" variant="solid" onClick={onOpen}>
          Open workspace <ArrowRight size={17} aria-hidden="true" />
        </DitherButton>
      </section>
      <WorkPreview />
      <span className="landing-index" aria-hidden="true">01 / WORK / CHECKPOINT / RESUME</span>
    </main>
  )
}
