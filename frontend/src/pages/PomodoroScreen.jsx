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
const TimerDisplay = ({ value, cardRef, reducedMotion }) => {
  const chars = value.split(''); // ['0','5',':','2','4']
  const prevRef = useRef(chars);

  useEffect(() => {
    if (reducedMotion) { prevRef.current = chars; return; }
    chars.forEach((ch, i) => {
      if (ch !== prevRef.current[i] && ch !== ':') {
        const el = document.getElementById(`digit-${i}`);
        if (!el) return;
        gsap.fromTo(el,
          { y: -18, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.22, ease: "power3.out" }
        );
      }
    });
    // Tick pulse on card
    if (cardRef.current) {
      gsap.fromTo(cardRef.current,
        { scale: 1.0025 },
        { scale: 1, duration: 0.18, ease: "power2.out" }
      );
    }
    prevRef.current = chars;
  });

  return (
    <div className="mc-display tabular-nums leading-none tracking-tighter flex items-baseline overflow-hidden"
      style={{ fontSize: "clamp(5rem, 18vw, 10rem)", color: "oklch(var(--text))" }}>
      {chars.map((ch, i) => (
        <span
          key={i}
          id={`digit-${i}`}
          style={{ display: "inline-block", minWidth: ch === ':' ? "0.3em" : "0.6em", textAlign: "center" }}
        >
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
  const [focusIntent, setFocusIntent] = useState("");
  const focusIntentRef = useRef("");
  const selectedRepoRef = useRef(null);

  // Keep refs in sync
  useEffect(() => { focusIntentRef.current = focusIntent; }, [focusIntent]);
  useEffect(() => { selectedRepoRef.current = selectedRepo; }, [selectedRepo]);

  useEffect(() => {
    sessionApi.list().then(sessions => {
      const last = sessions.find(s => s.intent);
      if (last?.intent) setFocusIntent(last.intent);
    }).catch(() => {});
  }, []);

  const handleTimerComplete = useCallback((elapsedMinutes) => {
    if (mode === "pomodoro") {
      const duration = elapsedMinutes ?? settings.pomodoro;
      if (duration > 0) {
        sessionApi.create({
          mode: "pomodoro",
          duration,
          intent: focusIntentRef.current,
          repoName: selectedRepoRef.current?.full_name
        }).catch(console.error);
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
  };

  const handlePlayPause = () => {
    if (!isActive) hasStarted.current = true;
    if (!REDUCED_MOTION && playBtnRef.current) {
      gsap.fromTo(playBtnRef.current,
        { scale: 0.82, rotate: isActive ? -12 : 12 },
        { scale: 1, rotate: 0, duration: 0.45, ease: "back.out(2.5)" }
      );
    }
    setIsActive(a => !a);
  };

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
    <div ref={containerRef} className="max-w-5xl mx-auto pb-32 space-y-16 px-6 pt-8">

      {/* Header */}
      <header className="reveal space-y-4">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-full mc-body text-[10px] font-bold uppercase tracking-widest"
            style={{ background: "oklch(var(--primary) / 0.1)", color: "oklch(var(--primary))" }}>
            {mode === 'pomodoro' ? 'Focus Session' : 'Recovery Period'}
          </span>
          <span className="mc-label">Session {(sessionsCompleted % 4) + 1} of 4</span>
        </div>
        <h1 className="mc-display text-5xl lg:text-7xl tracking-tight leading-none">
          Stay <span className="italic">present.</span>
        </h1>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">

        {/* Timer */}
        <div className="lg:col-span-7 reveal">
          <div ref={cardRef} className="mc-card flex flex-col items-center py-16 space-y-10 border"
            style={{
              borderColor: isActive ? "oklch(var(--primary) / 0.25)" : "oklch(var(--text) / 0.05)",
              boxShadow: isActive ? "0 0 0 4px oklch(var(--primary) / 0.07), 0 20px 60px oklch(var(--primary) / 0.08)" : "none",
              transition: "border-color 0.6s ease, box-shadow 0.6s ease",
              willChange: "transform",
            }}>

            {/* Progress bar */}
            <div className="w-full h-0.5 rounded-full overflow-hidden" style={{ background: "oklch(var(--text) / 0.05)" }}>
              <div className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${progress * 100}%`, background: "oklch(var(--primary))" }} />
            </div>

            <TimerDisplay
              value={formatTime(timeLeft)}
              cardRef={cardRef}
              reducedMotion={REDUCED_MOTION}
            />

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
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-5 space-y-10 reveal">
          <section className="space-y-4">
            <div className="flex items-center gap-2.5">
              {React.createElement(Target, { className: "w-3.5 h-3.5", style: { color: "oklch(var(--primary))" } })}
              <label htmlFor="focus-intent" className="mc-label cursor-pointer">Current Objective</label>
            </div>
            <textarea
              id="focus-intent"
              value={focusIntent}
              onChange={(e) => setFocusIntent(e.target.value)}
              className="w-full bg-transparent border-none mc-display text-2xl resize-none focus:outline-none italic"
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
                  <Link to="/settings" className="mc-label hover:opacity-70 transition-opacity"
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
              className="w-full rounded-2xl px-4 py-3 mc-body text-sm focus:outline-none appearance-none cursor-pointer border"
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

export default PomodoroScreen;
