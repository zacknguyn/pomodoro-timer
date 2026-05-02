import React from "react";

/**
 * EmptyState — unified empty state for lists, tables, and sections.
 * Props: icon (lucide component), title, body, action ({ label, onClick/href })
 */
const EmptyState = ({ icon, title, body, action }) => (
  <div className="flex flex-col items-center justify-center py-20 px-8 text-center border-2 border-dashed rounded-[32px] space-y-4"
    style={{ borderColor: "oklch(var(--text) / 0.06)" }}>
    {icon && (
      <div className="w-12 h-12 rounded-full flex items-center justify-center"
        style={{ background: "oklch(var(--text) / 0.04)" }}>
        {React.createElement(icon, { className: "w-5 h-5", style: { color: "oklch(var(--text) / 0.25)" } })}
      </div>
    )}
    {title && <p className="mc-display text-xl tracking-tight" style={{ color: "oklch(var(--text) / 0.6)" }}>{title}</p>}
    {body && <p className="mc-body text-sm max-w-xs" style={{ color: "oklch(var(--text) / 0.35)" }}>{body}</p>}
    {action && (
      action.href
        ? <a href={action.href} className="mc-label hover:opacity-70 transition-opacity">{action.label} →</a>
        : <button onClick={action.onClick} className="mc-label hover:opacity-70 transition-opacity">{action.label} →</button>
    )}
  </div>
);

export default EmptyState;
