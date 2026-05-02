import React from "react";

/**
 * EditorialCard — dark inverted card (oklch(var(--text)) background).
 * Used for high-emphasis sections: active repo, cluster objective, auth panels.
 *
 * Props:
 *   children  — card content
 *   glow      — show subtle primary glow in top-right corner (default: false)
 *   glowPos   — "top-right" | "bottom-right" (default: "top-right")
 *   className — extra classes
 *
 * Usage:
 *   <EditorialCard glow>
 *     <h3 style={{ color: "oklch(var(--canvas))" }}>pomodoro-timer</h3>
 *   </EditorialCard>
 */
const EditorialCard = ({ children, glow = false, glowPos = "top-right", className = "" }) => {
  const glowClass = glowPos === "bottom-right"
    ? "bottom-0 right-0 translate-x-16 translate-y-16"
    : "top-0 right-0 translate-x-16 -translate-y-16";

  return (
    <div
      className={`mc-card relative overflow-hidden flex flex-col ${className}`}
      style={{ background: "oklch(var(--text))" }}
    >
      {glow && (
        <div
          className={`absolute ${glowClass} w-48 h-48 rounded-full blur-xl pointer-events-none`}
          style={{ background: "oklch(var(--primary) / 0.08)" }}
        />
      )}
      <div className="relative z-10 flex flex-col h-full">{children}</div>
    </div>
  );
};

export default EditorialCard;
