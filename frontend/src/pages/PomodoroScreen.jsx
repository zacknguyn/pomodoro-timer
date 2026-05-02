import React, { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, RotateCcw, SkipForward, Github, Target } from "lucide-react";
import { useBlocker } from "react-router-dom";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Link } from "react-router-dom";
import { sessionApi, githubApi } from "@/lib/api";
import { toast } from "sonner";
import SectionHeader from "@/components/SectionHeader";

gsap.registerPlugin(useGSAP);

const MODES = { pomodoro: 'Focus', shortBreak: 'Short', longBreak: 'Long' };
const REDUCED_MOTION = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Split time string into individual digit/colon spans for morphing
const TimerDisplay = ({ value, reducedMotion }) => {
  const chars = value.split('');
  const prevRef = useRef(chars);

  useEffect(() => {
    if (reducedMotion) { prevRef.current = chars; return; }
    chars.forEach((ch, i) => {
      if (ch !== prevRef.current[i] && ch !== ':') {
        const el = document.getElementById(`digit-${i}`);
        if (!el) return;
        gsap.fromTo(el,
          { y: -14, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.2, ease: "power3.out" }
        );
      }
    });
    prevRef.current = chars;
  }, [value]);

  return (
    <div className="mc-display tabular-nums leading-none tracking-tighter flex items-baseline"
      style={{ fontSize: "clamp(5rem, 18vw, 10rem)", color: "oklch(var(--text))" }}>
      {chars.map((ch, i) => (
        <span key={i} id={`digit-${i}`}
          style={{ display: "inline-block", minWidth: ch === ':' ? "0.3em" : "0.6em", textAlign: "center" }}>
          {ch}
        </span>
      ))}
    </div>
  );
};

const PomodoroScreen = () => {
  const containerRef = useRef(null);
  const cardRef = useRef(null);
  const playBtnRef = useRef(null);
  const headlineRef = useRef(null);

  const [repos, setRepos] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState(() => {
    try { return JSON.parse(localStorage.getItem('last_repo') || 'null'); } catch { return null; }
  });
  const [commits, setCommits] = useState([]);
  const [githubConnected, setGithubConnected] = useState(false);
  const [settings, setSettings] = useState(() => {
    const s = localStorage.getItem("kernel_settings");
    return s ? JSON.parse(s) : { pomodoro: 25, shortBreak: 5, longBreak: 15 };
  });

  // Re-read settings when changed in another tab or Settings screen
  useEffect(() => {
    const handler = () => {
      const s = localStorage.getItem("kernel_settings");
      if (s) setSettings(JSON.parse(s));
    };
    window.addEventListener('storage', handler);
    window.addEventListener('focus', handler);
    return () => { window.removeEventListener('storage', handler); window.removeEventListener('focus', handler); };
  }, []);
  const [mode, setMode] = useState("pomodoro");
  const [timeLeft, setTimeLeft] = useState(settings.pomodoro * 60);
  const [isActive, setIsActive] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [pendingSession, setPendingSession] = useState(null); // { duration, intent, repoName }
  const hasStarted = useRef(false);

  // Request notification permission with context
  useEffect(() => {
    if (!('Notification' in window) || Notification.permission !== 'default') return;
    const t = setTimeout(() => {
      toast('Enable session notifications?', {
        description: 'Get notified when your focus or break ends.',
        action: {
          label: 'Enable',
          onClick: () => Notification.requestPermission(),
        },
        duration: 8000,
      });
    }, 3000);
    return () => clearTimeout(t);
  }, []);

  const notify = (title, body) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.ico' });
    }
  };

  const chime = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const notes = [523.25, 659.25, 783.99]; // C5 E5 G5
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        const t = ctx.currentTime + i * 0.18;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.18, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        osc.start(t);
        osc.stop(t + 0.5);
      });
    } catch { /* audio not available */ }
  };
  const [focusIntent, setFocusIntent] = useState(() => localStorage.getItem('last_intent') || "");
  const focusIntentRef = useRef(localStorage.getItem('last_intent') || "");
  const selectedRepoRef = useRef(null);

  // Keep refs in sync
  useEffect(() => {
    focusIntentRef.current = focusIntent;
    localStorage.setItem('last_intent', focusIntent);
  }, [focusIntent]);
  useEffect(() => { selectedRepoRef.current = selectedRepo; }, [selectedRepo]);

  useEffect(() => {
    sessionApi.list().then(sessions => {
      const last = sessions.find(s => s.intent);
      if (last?.intent && !localStorage.getItem('last_intent')) setFocusIntent(last.intent);
    }).catch(() => {});
  }, []);

  const handleTimerComplete = useCallback((elapsedMinutes) => {
    if (mode === "pomodoro") {
      const duration = elapsedMinutes ?? settings.pomodoro;
      if (duration > 0) {
        setPendingSession({ duration, intent: focusIntentRef.current, repoName: selectedRepoRef.current?.full_name });
      }
      setSessionsCompleted(prev => prev + 1);
      chime();
      notify("Focus session complete", "Time for a break. Well done.");
      setMode("shortBreak");
      setTimeLeft(settings.shortBreak * 60);
    } else {
      chime();
      notify("Break over", "Ready to focus again?");
      setMode("pomodoro");
      setTimeLeft(settings.pomodoro * 60);
    }
    setIsActive(false);
    hasStarted.current = false;
  }, [mode, settings]);

  // Block navigation when timer is running
  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    isActive && currentLocation.pathname !== nextLocation.pathname
  );

  useEffect(() => {
    if (blocker.state === 'blocked') {
      if (window.confirm('Timer is running. Leave anyway?')) {
        blocker.proceed();
      } else {
        blocker.reset();
      }
    }
  }, [blocker]);

  useEffect(() => {
    const handler = (e) => {
      if (isActive) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isActive]);

  const changeMode = (newMode) => {
    setIsActive(false);
    hasStarted.current = false;
    setMode(newMode);
    setTimeLeft(settings[newMode] * 60);
    if (!REDUCED_MOTION && headlineRef.current) {
      gsap.fromTo(headlineRef.current,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.4, ease: "power3.out" }
      );
    }
  };

  const handlePlayPause = useCallback(() => {
    if (!isActive) hasStarted.current = true;
    if (!REDUCED_MOTION && playBtnRef.current) {
      gsap.fromTo(playBtnRef.current,
        { scale: 0.88, rotate: isActive ? -8 : 8 },
        { scale: 1, rotate: 0, duration: 0.35, ease: "power3.out" }
      );
    }
    setIsActive(a => !a);
  }, [isActive]);

  // Keyboard shortcuts: Space = play/pause, R = reset, 1/2/3 = mode
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
      if (e.code === 'Space') { e.preventDefault(); handlePlayPause(); }
      else if (e.key === 'r' || e.key === 'R') setTimeLeft(settings[mode] * 60);
      else if (e.key === '1') changeMode('pomodoro');
      else if (e.key === '2') changeMode('shortBreak');
      else if (e.key === '3') changeMode('longBreak');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handlePlayPause, settings, mode]);

  useEffect(() => {
    githubApi.getRepos()
      .then(data => { setRepos(data); setGithubConnected(true); })
      .catch(() => setGithubConnected(false));
  }, []);

  useEffect(() => {
    if (selectedRepo) {
      githubApi.getCommits(selectedRepo.owner, selectedRepo.name)
        .then(setCommits).catch(console.error);
    }
  }, [selectedRepo]);

  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { handleTimerComplete(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isActive, handleTimerComplete]);

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const progress = 1 - timeLeft / (settings[mode] * 60);

  useGSAP(() => {
    gsap.set(".reveal", { opacity: 0, y: 24 });
    gsap.to(".reveal", { opacity: 1, y: 0, stagger: 0.12, duration: 1, ease: "power4.out" });
  }, { scope: containerRef });

  return (
    <div ref={containerRef} className="max-w-5xl mx-auto pb-32 space-y-10 px-4 sm:px-6 pt-8">

      {/* Header */}
      <header className="reveal space-y-4">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-full mc-body text-[10px] font-bold uppercase tracking-widest"
            style={{
              background: mode === 'pomodoro' ? "oklch(var(--primary) / 0.1)" : "oklch(var(--accent) / 0.1)",
              color: mode === 'pomodoro' ? "oklch(var(--primary))" : "oklch(var(--accent))",
            }}>
            {mode === 'pomodoro' ? 'Focus Session' : 'Recovery Period'}
          </span>
          <span className="mc-label">Session {(sessionsCompleted % 4) + 1} of 4</span>
        </div>
        <h1 ref={headlineRef} className="mc-display text-4xl sm:text-5xl lg:text-7xl tracking-tight leading-none">
          {mode === 'pomodoro' ? <>Stay <span className="italic">present.</span></> : mode === 'shortBreak' ? <>Rest <span className="italic">well.</span></> : <>Breathe <span className="italic">deeply.</span></>}
        </h1>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">

        {/* Timer */}
        <div className="lg:col-span-7 reveal">
          <div ref={cardRef} className="mc-card flex flex-col items-center py-10 sm:py-16 space-y-8 sm:space-y-10 border"
            style={{
              borderColor: isActive ? "oklch(var(--primary) / 0.25)" : "oklch(var(--text) / 0.05)",
              boxShadow: isActive ? "0 0 0 4px oklch(var(--primary) / 0.07), 0 20px 60px oklch(var(--primary) / 0.08)" : "none",
              transition: "border-color 0.6s ease, box-shadow 0.6s ease",
            }}>

            {/* Progress bar */}
            <div className="w-full h-0.5 rounded-full overflow-hidden" style={{ background: "oklch(var(--text) / 0.05)" }}>
              <div className="h-full rounded-full origin-left transition-transform duration-1000"
                style={{ transform: `scaleX(${progress})`, background: "oklch(var(--primary))" }} />
            </div>

            <TimerDisplay
              value={formatTime(timeLeft)}
              reducedMotion={REDUCED_MOTION}
            />

            {pendingSession ? (
              <InlineNoteInput session={pendingSession} onSave={(note) => {
                sessionApi.create({ mode: 'pomodoro', ...pendingSession, note }).catch(console.error);
                setPendingSession(null);
              }} onSkip={() => {
                sessionApi.create({ mode: 'pomodoro', ...pendingSession }).catch(console.error);
                setPendingSession(null);
              }} />
            ) : (
            <div className="flex items-center gap-6">
              <button onClick={() => setTimeLeft(settings[mode] * 60)}
                aria-label="Reset timer"
                className="p-4 rounded-full transition-colors hover:bg-[oklch(var(--text)/0.05)]"
                style={{ color: "oklch(var(--text-muted))" }}>
                {React.createElement(RotateCcw, { className: "w-5 h-5" })}
              </button>

              <button
                ref={playBtnRef}
                onClick={handlePlayPause}
                aria-label={isActive ? "Pause timer" : "Start timer"}
                className="mc-btn-primary w-20 h-20 flex items-center justify-center rounded-full"
                style={{ willChange: "transform" }}>
                {isActive
                  ? React.createElement(Pause, { className: "w-7 h-7 fill-current" })
                  : React.createElement(Play, { className: "w-7 h-7 fill-current ml-0.5" })}
              </button>

              <button onClick={() => isActive && handleTimerComplete(Math.max(1, Math.floor(((settings[mode] ?? 25) * 60 - timeLeft) / 60)))}
                aria-label="Skip to next phase"
                disabled={!isActive}
                className="p-4 rounded-full transition-all hover:bg-[oklch(var(--text)/0.05)] disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ color: "oklch(var(--text-muted))" }}>
                {React.createElement(SkipForward, { className: "w-5 h-5" })}
              </button>
            </div>
            )}

            <div className="flex gap-1.5 w-full">
              {Object.entries(MODES).map(([m, label]) => (
                <button key={m} onClick={() => changeMode(m)}
                  className="flex-1 px-2 sm:px-5 py-2 rounded-full mc-body text-[10px] font-bold uppercase tracking-widest transition-all text-center"
                  style={mode === m
                    ? { background: "oklch(var(--text))", color: "oklch(var(--canvas))" }
                    : { color: "oklch(var(--text-muted))" }}>
                  {label}
                </button>
              ))}
            </div>
            <p className="mc-label" style={{ color: "oklch(var(--text) / 0.2)" }}>
              Space · R · 1 / 2 / 3
            </p>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-5 space-y-10 reveal min-w-0">
          <section className="space-y-4">
            <div className="flex items-center gap-2.5">
              {React.createElement(Target, { className: "w-3.5 h-3.5", style: { color: "oklch(var(--primary))" } })}
              <label htmlFor="focus-intent" className="mc-label cursor-pointer">Current Objective</label>
            </div>
            <textarea
              id="focus-intent"
              value={focusIntent}
              onChange={(e) => setFocusIntent(e.target.value)}
              className="w-full bg-transparent border-none mc-display text-2xl resize-none focus-visible:ring-2 focus-visible:ring-[oklch(var(--primary)/0.4)] rounded-lg italic"
              style={{ color: "oklch(var(--text))" }}
              rows={2}
              placeholder="What are you working on?"
            />
          </section>

          <div style={{ height: "1px", background: "oklch(var(--text) / 0.06)" }} />

          <section className="mc-card space-y-6" style={{ background: "oklch(var(--text) / 0.03)", border: "1px solid oklch(var(--text) / 0.05)" }}>
            <SectionHeader
              title={
                <div className="flex items-center gap-2.5">
                  {React.createElement(Github, { className: "w-3.5 h-3.5", style: { color: "oklch(var(--text-muted))" } })}
                  <span className="mc-label">GitHub Repo</span>
                </div>
              }
              right={
                !githubConnected && (
                  <Link to="/app/settings" className="mc-label hover:opacity-70 transition-opacity"
                    style={{ color: "oklch(var(--primary))" }}>Connect</Link>
                )
              }
            />
            <select
              id="repo-select"
              aria-label="Select repository"
              onChange={(e) => {
                const repo = repos.find(r => r.full_name === e.target.value) || null;
                setSelectedRepo(repo);
                if (repo) localStorage.setItem('last_repo', JSON.stringify(repo));
              }}
              className="w-full rounded-2xl px-4 py-3 mc-body text-sm focus-visible:ring-2 focus-visible:ring-[oklch(var(--primary)/0.4)] appearance-none cursor-pointer border"
              style={{ background: "oklch(var(--canvas))", borderColor: "oklch(var(--text) / 0.08)", color: "oklch(var(--text))" }}>
              <option value="">Select repository</option>
              {repos.map(r => <option key={r.id} value={r.full_name}>{r.name}</option>)}
            </select>
            <div className="space-y-4">
              <span className="mc-label">Recent commits</span>
              <div className="space-y-3">
                {commits.slice(0, 3).map(c => (
                  <div key={c.sha}>
                    <p className="mc-body text-xs line-clamp-1" style={{ color: "oklch(var(--text) / 0.75)" }}>{c.message}</p>
                    <p className="mc-label mt-0.5">{c.sha.substring(0, 7)}</p>
                  </div>
                ))}
                {commits.length === 0 && (
                  <p className="mc-body text-xs italic" style={{ color: "oklch(var(--text) / 0.3)" }}>Select a repo to see recent commits.</p>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

const InlineNoteInput = ({ session, onSave, onSkip }) => {
  const [note, setNote] = React.useState('');
  return (
    <div className="w-full space-y-3 py-2">
      <p className="mc-label text-center" style={{ color: "oklch(var(--primary))" }}>
        Session complete — {session.duration}m · Add a note?
      </p>
      <textarea
        autoFocus rows={2} value={note} onChange={e => setNote(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); note.trim() ? onSave(note.trim()) : onSkip(); } if (e.key === 'Escape') onSkip(); }}
        placeholder="What did you accomplish? (optional)"
        className="w-full px-4 py-3 rounded-2xl mc-body text-sm outline-none focus-visible:ring-2 focus-visible:ring-[oklch(var(--primary)/0.4)] border resize-none"
        style={{ background: "oklch(var(--surface))", borderColor: "oklch(var(--text) / 0.08)", color: "oklch(var(--text))" }}
      />
      <div className="flex items-center justify-between">
        <button onClick={onSkip} className="mc-label hover:opacity-60 transition-opacity"
          style={{ color: "oklch(var(--text-muted))" }}>Skip</button>
        <button onClick={() => note.trim() ? onSave(note.trim()) : onSkip()}
          className="px-5 py-2 rounded-full mc-body text-sm font-bold uppercase tracking-widest transition-all hover:scale-105"
          style={{ background: "oklch(var(--text))", color: "oklch(var(--canvas))" }}>
          Save
        </button>
      </div>
    </div>
  );
};

export default PomodoroScreen;
