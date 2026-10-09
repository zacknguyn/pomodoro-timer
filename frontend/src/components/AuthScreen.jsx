import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Eye, EyeOff, Github } from 'lucide-react'
import { authApi } from '../lib/authApi'
import './PublicScreens.css'

const GITHUB_ERRORS = {
  github_state_invalid: 'GitHub sign-in expired. Please try again.',
  github_cancelled: 'GitHub sign-in was cancelled. Try again or use email.',
  github_email_required: 'Add a verified primary email to your GitHub account before signing in.',
  github_email_taken: 'This email already has a Pomogit account. Log in with email; GitHub account linking is not available yet.',
  github_suspended: 'This account is suspended.',
  github_not_configured: 'GitHub sign-in is not configured yet. Use email for now.',
  github_unavailable: 'GitHub could not complete sign-in. Please try again.',
}

export default function AuthScreen({ initialMode = 'login', preview = false, onAuthenticated, onNavigate, onBack }) {
  const [showPassword, setShowPassword] = useState(false)
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(() => GITHUB_ERRORS[new URLSearchParams(window.location.search).get('github_error')] || '')
  const register = initialMode === 'register'
  const recover = initialMode === 'recover'
  useEffect(() => {
    const url = new URL(window.location.href)
    if (url.searchParams.has('github_error')) {
      url.searchParams.delete('github_error')
      window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
    }
  }, [])
  async function githubLogin() {
    if (preview) { onAuthenticated(); return }
    if (busy) return
    setBusy(true); setError('')
    try {
      const { authorizationUrl } = await authApi.github()
      const url = new URL(authorizationUrl)
      if (url.origin !== 'https://github.com' || url.pathname !== '/login/oauth/authorize') throw new Error('The account service returned an invalid GitHub sign-in link.')
      window.location.assign(url.href)
    } catch (failure) { setError(failure.message); setBusy(false) }
  }
  async function submit(event) {
    event.preventDefault()
    if (busy) return
    if (recover) { setSent(true); return }
    if (preview) { onAuthenticated(); return }
    const fields = new FormData(event.currentTarget)
    setBusy(true); setError('')
    try {
      const { user } = await authApi[register ? 'register' : 'login']({ email: fields.get('email'), password: fields.get('password') })
      onAuthenticated(user)
    } catch (failure) { setError(failure.message) } finally { setBusy(false) }
  }
  return <div className="pg-public pg-account">
    <header className="pg-header"><a className="pg-brand" href="#landing" onClick={(event) => { event.preventDefault(); onBack() }}><img src="/pomogit-logo.png" alt="" />Pomogit</a><button onClick={onBack}><ArrowLeft size={16} />Back to product</button></header>
    <main className="pg-account-main"><section className="pg-account-entry">
      <header><p className="pg-eyebrow">{recover ? 'A fresh start' : register ? 'Make room for your work' : 'Welcome back'}</p><h1>{recover ? 'Reset your password.' : register ? 'Create your workspace.' : 'Log in to Pomogit.'}</h1><p>{recover ? preview ? 'Enter your account email to preview recovery.' : 'Password recovery is not connected yet.' : register ? 'Capture tasks. Keep your next step close.' : 'Pick up where you left off.'}</p></header>
      {!recover && <><button className="pg-primary pg-wide" disabled={busy} onClick={githubLogin}><Github size={19} />{busy ? 'Connecting…' : 'Continue with GitHub'}<ArrowRight size={17} /></button><p className="pg-caption">{preview ? 'Local preview · no GitHub connection or repository access.' : 'Sign in with your GitHub identity. Repository import is a separate step.'}</p><div className="pg-divider">Continue with email</div></>}
      {error && <p role="alert" className="pg-recovery">{error}</p>}
      {recover && !preview ? <p className="pg-recovery">Reset emails are unavailable. You can return to login below.</p> : sent ? <p role="status" className="pg-recovery">This preview does not send email. In the connected app, an eligible account would receive a reset link.</p> : <form className="pg-account-form" onSubmit={submit} aria-busy={busy}>
        <label>Email<input type="email" name="email" disabled={busy} autoComplete="email" required maxLength={254} placeholder="you@example.com" /></label>
        {!recover && <><label>Password<span className="pg-password"><input name="password" disabled={busy} type={showPassword ? 'text' : 'password'} autoComplete={register ? 'new-password' : 'current-password'} required minLength={register ? 12 : 1} maxLength={128} placeholder={register ? 'At least 12 characters' : 'Your password'} /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label>{!register && <a href="#recover" onClick={(event) => { event.preventDefault(); onNavigate('recover') }}>Forgot password?</a>}</>}
        <button className="pg-wide" type="submit" disabled={busy}>{busy ? 'Connecting…' : recover ? 'Preview reset request' : register ? 'Create workspace with email' : 'Log in with email'}<ArrowRight size={16} /></button>
      </form>}
      <p className="pg-account-switch">{recover ? <a href="#login" onClick={(event) => { event.preventDefault(); onNavigate('login') }}>Back to login</a> : <>{register ? 'Already have an account?' : 'New to Pomogit?'} <a href={register ? '#login' : '#register'} onClick={(event) => { event.preventDefault(); onNavigate(register ? 'login' : 'register') }}>{register ? 'Log in' : 'Create a workspace'}</a></>}</p>
      <p className="pg-caption pg-account-notice">{preview ? 'UI preview. Account actions open your local workspace. Credentials are neither stored nor sent.' : 'Your workspace is saved to your account. Login uses a secure, HttpOnly session cookie.'}</p>
    </section></main><footer className="pg-account-footer">Pomogit · A little room for focused work.</footer>
  </div>
}
