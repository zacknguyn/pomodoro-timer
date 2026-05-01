import React, { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Github } from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { authApi, settingsApi } from '@/lib/api';

const LoginScreen = () => {
  const container = useRef();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { token, user } = await authApi.login(email, password);
      localStorage.setItem('registry_token', token);
      localStorage.setItem('registry_user', JSON.stringify(user));
      localStorage.removeItem('github_token');
      // Sync timer settings from backend
      try {
        const s = await settingsApi.get();
        if (s) localStorage.setItem('kernel_settings', JSON.stringify({ pomodoro: s.pomodoro, shortBreak: s.shortBreak, longBreak: s.longBreak }));
      } catch { /* settings sync optional */ }
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useGSAP(() => {
    gsap.set('.reveal', { opacity: 0, y: 32 });
    gsap.to('.reveal', { opacity: 1, y: 0, stagger: 0.1, duration: 1, ease: 'power4.out' });
  }, { scope: container });

  return (
    <div ref={container} className="min-h-screen flex overflow-hidden" style={{ background: "oklch(var(--canvas))" }}>

      {/* Left — Editorial Panel */}
      <div className="hidden lg:flex w-5/12 flex-col justify-between p-16 relative overflow-hidden"
        style={{ background: "oklch(var(--text))" }}>
        {/* Subtle texture overlay */}
        <div className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=800&q=60')", backgroundSize: "cover", backgroundPosition: "center" }} />

        <div className="relative z-10 flex items-center gap-3 reveal">
          <div className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: "oklch(var(--primary))" }}>
            {React.createElement(Github, { className: "w-5 h-5 text-white" })}
          </div>
          <span className="mc-display text-2xl tracking-tighter italic" style={{ color: "oklch(var(--canvas))" }}>
            Pomogit.
          </span>
        </div>

        <div className="relative z-10 space-y-8">
          <h2 className="mc-display text-6xl leading-[0.9] tracking-tighter reveal" style={{ color: "oklch(var(--canvas))" }}>
            Stability<br />in the<br /><span className="italic" style={{ color: "oklch(var(--primary))" }}>Flow.</span>
          </h2>
          <p className="mc-body text-sm font-bold uppercase tracking-[0.3em] reveal"
            style={{ color: "oklch(var(--canvas) / 0.35)" }}>
            Institutional Grade · v1.0
          </p>
        </div>

        <div className="relative z-10 reveal">
          <div className="flex items-center gap-3 p-4 rounded-2xl border"
            style={{ borderColor: "oklch(var(--canvas) / 0.1)", background: "oklch(var(--canvas) / 0.05)" }}>
            <div className="w-2 h-2 rounded-full" style={{ background: "oklch(var(--accent))" }} />
            <span className="mc-label" style={{ color: "oklch(var(--canvas) / 0.4)" }}>
              13 nodes active · Sprint 04
            </span>
          </div>
        </div>
      </div>

      {/* Right — Auth Panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 lg:p-20">
        <div className="w-full max-w-sm space-y-12">

          <div className="reveal space-y-3">
            <h1 className="mc-display text-5xl tracking-tighter">Access.</h1>
            <p className="mc-body text-base italic" style={{ color: "oklch(var(--text-muted))" }}>
              Authenticate to enter the workspace.
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleLogin}>
            {error && (
              <div className="reveal p-4 rounded-2xl border"
                style={{ background: "oklch(var(--primary) / 0.06)", borderColor: "oklch(var(--primary) / 0.15)" }}>
                <p className="mc-body text-xs font-bold uppercase tracking-widest" style={{ color: "oklch(var(--primary))" }}>
                  {error}
                </p>
              </div>
            )}

            <div className="reveal space-y-2">
              <label className="mc-label flex items-center gap-2">
                <span className="w-1 h-1 rounded-full" style={{ background: "oklch(var(--primary))" }} />
                Work email
              </label>
              <input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mc-input"
                style={{ background: "oklch(var(--text) / 0.03)" }}
              />
            </div>

            <div className="reveal space-y-2">
              <label className="mc-label flex items-center gap-2">
                <span className="w-1 h-1 rounded-full" style={{ background: "oklch(var(--primary))" }} />
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mc-input"
                style={{ background: "oklch(var(--text) / 0.03)" }}
              />
            </div>

            <div className="reveal pt-2">
              <button type="submit" disabled={loading} className="mc-btn-primary w-full h-14 text-base shadow-lg">
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </div>
          </form>

          <div className="reveal text-center pt-4 border-t" style={{ borderColor: "oklch(var(--text) / 0.06)" }}>
            <p className="mc-body text-sm" style={{ color: "oklch(var(--text-muted))" }}>
              New to the registry?{' '}
              <Link to="/register" className="font-bold transition-opacity hover:opacity-60 underline underline-offset-4"
                style={{ color: "oklch(var(--text))" }}>
                Register Operator
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
