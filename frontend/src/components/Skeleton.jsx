const Skeleton = ({ className = "", style = {} }) => (
  <div
    className={`animate-pulse rounded-2xl ${className}`}
    style={{ background: "oklch(var(--text) / 0.06)", ...style }}
  />
);

export default Skeleton;
