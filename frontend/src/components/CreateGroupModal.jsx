import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Github } from "lucide-react";
import { groupApi, githubApi } from "@/lib/api";

const CreateGroupModal = ({ onClose, onCreated }) => {
  const [repos, setRepos] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    githubApi.getRepos().then(setRepos).catch((err) => setError(err.message || "Failed to load repositories. Try reconnecting GitHub in Settings."));
  }, []);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleRepoSelect = (repo) => {
    setSelectedRepo(repo);
    if (!name) setName(repo.name);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRepo || !name.trim()) return;
    setLoading(true);
    setError("");
    try {
      const group = await groupApi.create(name.trim(), selectedRepo.full_name);
      onCreated(group);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <>
      <div className="fixed inset-0 z-[100] backdrop-blur-sm"
        style={{ background: "oklch(var(--text) / 0.35)" }}
        onClick={onClose} />
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-6">
        <div className="w-full max-w-lg rounded-[32px] p-10 space-y-8"
          role="dialog" aria-modal="true" aria-labelledby="create-group-title"
          style={{ background: "oklch(var(--canvas))", boxShadow: "0 40px 80px oklch(var(--text) / 0.12)" }}>

          <div className="flex items-center justify-between">
            <div>
              <p className="mc-label mb-1">New Group</p>
              <h2 id="create-group-title" className="mc-display text-3xl tracking-tighter">Create a group</h2>
            </div>
            <button onClick={onClose} aria-label="Close dialog" className="p-2 rounded-full hover:bg-[oklch(var(--text)/0.05)] transition-colors">
              {React.createElement(X, { className: "w-5 h-5", style: { color: "oklch(var(--text))" } })}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Group name */}
            <div className="space-y-2">
              <label htmlFor="group-name" className="mc-label">Group name</label>
              <input id="group-name" type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="e.g. Frontend Team"
                className="w-full px-5 py-3.5 rounded-2xl mc-body text-sm outline-none focus-visible:ring-2 focus-visible:ring-[oklch(var(--primary)/0.4)] transition-all border"
                style={{ background: "oklch(var(--surface))", borderColor: "oklch(var(--text) / 0.08)", color: "oklch(var(--text))" }}
                required />
            </div>

            {/* Repo picker */}
            <div className="space-y-2">
              <label className="mc-label">GitHub repo</label>
              {error && !repos.length ? (
                <p className="mc-body text-sm" style={{ color: "oklch(var(--primary))" }}>{error}</p>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {repos.map(r => (
                    <button type="button" key={r.full_name}
                      onClick={() => handleRepoSelect(r)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all border"
                      style={{
                        background: selectedRepo?.full_name === r.full_name ? "oklch(var(--text))" : "oklch(var(--surface))",
                        borderColor: selectedRepo?.full_name === r.full_name ? "transparent" : "oklch(var(--text) / 0.06)",
                        color: selectedRepo?.full_name === r.full_name ? "oklch(var(--canvas))" : "oklch(var(--text))",
                      }}>
                      {React.createElement(Github, { className: "w-3.5 h-3.5 flex-shrink-0" })}
                      <span className="mc-body text-sm truncate">{r.full_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {error && repos.length > 0 && (
              <p className="mc-body text-sm" style={{ color: "oklch(var(--primary))" }}>{error}</p>
            )}

            <button type="submit" disabled={loading || !selectedRepo || !name.trim()}
              className="w-full py-4 rounded-full mc-body text-sm font-bold uppercase tracking-widest transition-all disabled:opacity-40"
              style={{ background: "oklch(var(--text))", color: "oklch(var(--canvas))" }}>
              {loading ? "Creating…" : "Create group"}
            </button>
          </form>
        </div>
      </div>
    </>,
    document.body
  );
};

export default CreateGroupModal;
