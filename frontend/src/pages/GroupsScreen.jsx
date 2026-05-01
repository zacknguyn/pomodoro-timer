import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Users, Github, Archive, ArrowRight } from "lucide-react";
import { groupApi } from "@/lib/api";
import CreateGroupModal from "@/components/CreateGroupModal";
import Skeleton from "@/components/Skeleton";

const TABS = ["active", "archived", "all"];

const GroupsScreen = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("active");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(() => {
    groupApi.list(tab === "all" ? undefined : tab)
      .then(data => { setGroups(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() =>
    groups.filter(g =>
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      g.repo_full_name.toLowerCase().includes(search.toLowerCase())
    ), [groups, search]);

  return (
    <div className="space-y-10 pb-20 px-8 pt-8 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-end justify-between gap-6">
        <div className="space-y-3">
          <p className="mc-label">Collaborative Clusters</p>
          <h1 className="mc-display text-5xl sm:text-6xl leading-[1.05] -tracking-[0.03em]">Groups</h1>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2.5 px-6 py-3.5 rounded-full mc-body text-sm font-bold uppercase tracking-widest transition-all active:scale-95"
          style={{ background: "oklch(var(--text))", color: "oklch(var(--canvas))" }}>
          {React.createElement(Plus, { className: "w-4 h-4" })}
          New group
        </button>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          {React.createElement(Search, { className: "absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4", style: { color: "oklch(var(--text-muted))" } })}
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search groups or repos…"
            className="w-full pl-11 pr-5 py-3 rounded-full mc-body text-sm outline-none border"
            style={{ background: "oklch(var(--surface))", borderColor: "oklch(var(--text) / 0.08)", color: "oklch(var(--text))" }} />
        </div>
        <div className="flex items-center gap-1 p-1 rounded-full" style={{ background: "oklch(var(--surface))" }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="px-5 py-2 rounded-full mc-body text-xs font-bold uppercase tracking-widest transition-all capitalize"
              style={tab === t
                ? { background: "oklch(var(--text))", color: "oklch(var(--canvas))" }
                : { color: "oklch(var(--text-muted))" }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Groups list */}
      {loading ? (
        <div className="space-y-3">
          {Array(3).fill(0).map((_, i) => <Skeleton key={i} style={{ height: "96px" }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-24 text-center border-2 border-dashed rounded-[32px]"
          style={{ borderColor: "oklch(var(--text) / 0.06)" }}>
          <p className="text-5xl mb-4" style={{ color: "oklch(var(--text) / 0.1)" }}>∅</p>
          <p className="mc-body text-sm italic" style={{ color: "oklch(var(--text-muted))" }}>
            {search ? "No groups match your search." : tab === "archived" ? "No archived groups." : "No groups yet — create one to get started."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(g => <GroupCard key={g.id} group={g} />)}
        </div>
      )}

      {showCreate && (
        <CreateGroupModal
          onClose={() => setShowCreate(false)}
          onCreated={(g) => { setShowCreate(false); setGroups(prev => [{ ...g, memberCount: 1 }, ...prev]); }}
        />
      )}
    </div>
  );
};

const GroupCard = ({ group: g }) => (
  <Link to={`/groups/${g.id}`}
    className="flex items-center justify-between p-6 rounded-[24px] border transition-all group hover:border-[oklch(var(--text)/0.15)]"
    style={{
      background: g.status === 'archived' ? "oklch(var(--surface) / 0.5)" : "oklch(var(--surface))",
      borderColor: "oklch(var(--text) / 0.06)",
      opacity: g.status === 'archived' ? 0.7 : 1,
    }}>
    <div className="flex items-center gap-5">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
        style={{ background: g.status === 'archived' ? "oklch(var(--text) / 0.06)" : "oklch(var(--text))" }}>
        {g.status === 'archived'
          ? React.createElement(Archive, { className: "w-5 h-5", style: { color: "oklch(var(--text-muted))" } })
          : React.createElement(Users, { className: "w-5 h-5", style: { color: "oklch(var(--canvas))" } })}
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <p className="mc-body text-sm font-bold" style={{ color: "oklch(var(--text))" }}>{g.name}</p>
          {g.status === 'archived' && (
            <span className="mc-label px-2 py-0.5 rounded-full" style={{ background: "oklch(var(--text) / 0.06)" }}>Archived</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mc-label">
          {React.createElement(Github, { className: "w-3 h-3" })}
          <span>{g.repo_full_name}</span>
          <span style={{ color: "oklch(var(--text) / 0.2)" }}>·</span>
          <span>{g.memberCount} {g.memberCount === 1 ? 'member' : 'members'}</span>
        </div>
      </div>
    </div>
    {React.createElement(ArrowRight, { className: "w-4 h-4 opacity-20 group-hover:opacity-60 group-hover:translate-x-0.5 transition-all", style: { color: "oklch(var(--text))" } })}
  </Link>
);

export default GroupsScreen;
