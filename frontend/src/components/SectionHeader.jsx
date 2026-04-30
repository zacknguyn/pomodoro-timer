import React from "react";

/**
 * SectionHeader — flex row with title on left, optional right slot.
 * Renders the mc-section-header pattern (border-bottom, space-between).
 *
 * Props:
 *   title     — string or JSX for the left side
 *   right     — optional right slot (button, label, icon)
 *   className — extra classes
 *
 * Usage:
 *   <SectionHeader title="Registry Log" right={<button>Archive</button>} />
 *   <SectionHeader title={<div className="space-y-1"><h3>...</h3><p>...</p></div>} right={...} />
 */
const SectionHeader = ({ title, right, className = "" }) => (
  <div className={`mc-section-header ${className}`}>
    {typeof title === "string" ? (
      <h3 className="mc-display text-2xl">{title}</h3>
    ) : (
      title
    )}
    {right && <div className="flex-shrink-0">{right}</div>}
  </div>
);

export default SectionHeader;
