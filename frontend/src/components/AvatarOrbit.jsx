import React from "react";
import { Timer } from "lucide-react";

/**
 * AvatarOrbit — circular avatar with optional satellite badge for active status.
 *
 * Props:
 *   src       — image URL
 *   alt       — alt text (required)
 *   size      — Tailwind size class pair, e.g. "w-14 h-14" (default) or "w-20 h-20"
 *   active    — show accent border + Timer satellite badge (default: false)
 *   loading   — img loading attribute (default: "lazy")
 *   className — extra classes on wrapper
 *
 * Usage:
 *   <AvatarOrbit src={member.avatar} alt={member.name} active={member.status === "Focusing"} />
 */
const AvatarOrbit = ({ src, alt, size = "w-14 h-14", active = false, loading = "lazy", className = "" }) => (
  <div className={`relative flex-shrink-0 ${className}`}>
    {active && (
      <div className="absolute inset-0 rounded-full pointer-events-none mc-orbit-pulse"
        style={{ border: "2px solid oklch(var(--accent) / 0.5)" }} />
    )}
    <div
      className={`mc-orbit ${size} border-2 transition-[transform,border-color] duration-300`}
      style={{ borderColor: active ? "oklch(var(--accent))" : "oklch(var(--text) / 0.06)" }}
    >
      <img src={src} alt={alt} loading={loading} className="w-full h-full object-cover" />
    </div>
    {active && (
      <div
        className="mc-satellite w-5 h-5 border-2 shadow-sm"
        style={{ background: "oklch(var(--accent))", borderColor: "oklch(var(--canvas))" }}
      >
        {React.createElement(Timer, { className: "w-2.5 h-2.5", style: { color: "oklch(var(--canvas))" } })}
      </div>
    )}
  </div>
);

export default AvatarOrbit;
