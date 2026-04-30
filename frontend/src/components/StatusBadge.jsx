import React from "react";

/**
 * StatusBadge — pill badge with border, uppercase tracking.
 *
 * variant:
 *   "success"   — primary color (focus sessions, SUCCESS)
 *   "active"    — accent color (Focusing)
 *   "muted"     — subdued (Break, Idle, INTERRUPT, default)
 *
 * Usage:
 *   <StatusBadge variant="success">SUCCESS</StatusBadge>
 *   <StatusBadge variant="active">Focusing</StatusBadge>
 *   <StatusBadge>Idle</StatusBadge>
 */
const STYLES = {
  success: {
    borderColor: "oklch(var(--primary) / 0.2)",
    color: "oklch(var(--primary))",
    background: "oklch(var(--primary) / 0.05)",
  },
  active: {
    borderColor: "oklch(var(--accent) / 0.3)",
    color: "oklch(var(--accent))",
    background: "oklch(var(--accent) / 0.06)",
  },
  muted: {
    borderColor: "oklch(var(--text) / 0.08)",
    color: "oklch(var(--text) / 0.3)",
    background: "transparent",
  },
};

const StatusBadge = ({ variant = "muted", children, className = "" }) => (
  <span
    className={`mc-body text-[9px] font-bold px-3 py-1 rounded-full border tracking-widest uppercase ${className}`}
    style={STYLES[variant]}
  >
    {children}
  </span>
);

export default StatusBadge;
