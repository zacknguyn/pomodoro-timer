import { useState } from 'react'
import { ArrowLeft, ArrowRight, Eye, EyeOff, Github } from 'lucide-react'
import './PublicScreens.css'

export default function AuthScreen({ initialMode = 'login', onAuthenticated, onNavigate, onBack }) {
  const [showPassword, setShowPassword] = useState(false)
  const [sent, setSent] = useState(false)
  const register = initialMode === 'register'
  const recover = initialMode === 'recover'
  return <div className="pg-public pg-account">
    <header className="pg-header"><a className="pg-brand" href="#landing" onClick={(event) => { event.preventDefault(); onBack() }}><img src="/pomogit-logo.png" alt="" />Pomogit</a><button onClick={onBack}><ArrowLeft size={16} />Back to product</button></header>
    <main className="pg-account-main"><section className="pg-account-entry">
      <header><p className="pg-eyebrow">{recover ? 'A fresh start' : register ? 'Make room for your work' : 'Welcome back'}</p><h1>{recover ? 'Reset your password.' : register ? 'Create your workspace.' : 'Log in to Pomogit.'}</h1><p>{recover ? 'Enter your account email to request a reset link.' : register ? 'Capture tasks. Keep your next step close.' : 'Pick up where you left off.'}</p></header>
      {!recover && <><button className="pg-primary pg-wide" onClick={onAuthenticated}><Github size={19} />Continue with GitHub<ArrowRight size={17} /></button><p className="pg-caption">Local preview · no GitHub connection or repository access.</p><div className="pg-divider">or continue with email</div></>}
      {sent ? <p role="status" className="pg-recovery">This preview does not send email. In the connected app, an eligible account would receive a reset link.</p> : <form className="pg-account-form" onSubmit={(event) => { event.preventDefault(); if (recover) setSent(true); else onAuthenticated() }}>
        <label>Email<input type="email" name="email" autoComplete="email" required maxLength={254} placeholder="you@example.com" /></label>
        {!recover && <><label>Password<span className="pg-password"><input name="password" type={showPassword ? 'text' : 'password'} autoComplete={register ? 'new-password' : 'current-password'} required minLength={register ? 12 : 1} maxLength={128} placeholder={register ? 'At least 12 characters' : 'Your password'} /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label>{!register && <a href="#recover" onClick={(event) => { event.preventDefault(); onNavigate('recover') }}>Forgot password?</a>}</>}
        <button className="pg-wide" type="submit">{recover ? 'Preview reset request' : register ? 'Create workspace with email' : 'Log in with email'}<ArrowRight size={16} /></button>
      </form>}
      <p className="pg-account-switch">{recover ? <a href="#login" onClick={(event) => { event.preventDefault(); onNavigate('login') }}>Back to login</a> : <>{register ? 'Already have an account?' : 'New to Pomogit?'} <a href={register ? '#login' : '#register'} onClick={(event) => { event.preventDefault(); onNavigate(register ? 'login' : 'register') }}>{register ? 'Log in' : 'Create a workspace'}</a></>}</p>
      <p className="pg-caption pg-account-notice">UI preview. Account actions open your local workspace. Credentials are neither stored nor sent.</p>
    </section></main><footer className="pg-account-footer">Pomogit · A little room for focused work.</footer>
  </div>
}
