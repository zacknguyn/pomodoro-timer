import { useState } from 'react'
import { ArrowRight, Check, Eye, EyeOff, LockKeyhole } from 'lucide-react'
import { authApi } from '../lib/authApi'
import { DitherButton } from './dither-kit/DitherButton'
import { DitherGradient } from './dither-kit/DitherGradient'

function Brand() {
  return <span className="auth-brand"><img src="/pomogit-logo.png" alt="" /><strong>Pomogit</strong></span>
}

export default function AuthScreen({ initialMode = 'login', onAuthenticated, onBack }) {
  const [mode, setMode] = useState(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const isRegister = mode === 'register'

  function switchMode(next) {
    setMode(next)
    setError('')
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${next}`)
  }

  async function submit(event) {
    event.preventDefault()
    if (isRegister && password !== confirmPassword) {
      setError('The passwords do not match.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const result = await authApi[mode]({ email, password })
      onAuthenticated(result.user)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-story" aria-label="Pomogit account introduction">
        <DitherGradient from="blue" to="transparent" direction="right" cell={3} opacity={0.82} bloom="high" />
        <Brand />
        <div className="auth-story-copy">
          <p className="section-kicker">Private workspace</p>
          <h1>Make progress<br />recoverable.</h1>
          <p>Tasks, focus sessions, and checkpoints stay attached to your account—never to a shared global workspace.</p>
        </div>
        <ol className="auth-proof" aria-label="How Pomogit works">
          <li><span>01</span>Choose one outcome</li>
          <li><span>02</span>Protect the work</li>
          <li><span>03</span>Leave a checkpoint</li>
        </ol>
      </section>

      <section className="auth-entry">
        <button className="auth-back" type="button" onClick={onBack}>Back to start</button>
        <div className="auth-form-wrap">
          <div className="auth-lock" aria-hidden="true"><LockKeyhole size={18} /></div>
          <header>
            <p className="section-kicker">{isRegister ? 'Create workspace' : 'Welcome back'}</p>
            <h2>{isRegister ? 'Start with one account' : 'Return to your work'}</h2>
            <p>{isRegister ? 'Your work is private by default.' : 'Use the account that owns this workspace.'}</p>
          </header>

          <div className="auth-mode" role="tablist" aria-label="Account action">
            <button type="button" role="tab" aria-selected={!isRegister} onClick={() => switchMode('login')}>Sign in</button>
            <button type="button" role="tab" aria-selected={isRegister} onClick={() => switchMode('register')}>Register</button>
          </div>

          <form onSubmit={submit}>
            <label>Email<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={254} placeholder="you@example.com" /></label>
            <label>Password
              <span className="password-field">
                <input type={showPassword ? 'text' : 'password'} autoComplete={isRegister ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} required minLength={12} maxLength={128} placeholder="At least 12 characters" />
                <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
              </span>
            </label>
            {isRegister && <label>Confirm password<input type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required minLength={12} maxLength={128} /></label>}
            {error && <p className="auth-error" role="alert">{error}</p>}
            <DitherButton type="submit" disabled={busy}>{busy ? 'Securing workspace…' : isRegister ? 'Create account' : 'Sign in'} <ArrowRight size={17} /></DitherButton>
          </form>

          <p className="auth-session-note"><Check size={14} aria-hidden="true" /> Session stored in a secure, server-managed cookie.</p>
        </div>
      </section>
    </main>
  )
}
