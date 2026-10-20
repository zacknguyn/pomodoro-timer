# Dither Kit charts

Upstream source: https://www.tripwire.sh/r/core.json and https://www.tripwire.sh/r/area-chart.json
Documentation: https://www.tripwire.sh/dither-kit

Snapshot used in the approved dashboard preview. Includes only the area/line renderer and its dependencies.
Local adjustments: aria-pressed on the legend, truncatable legend labels, app/OS reduced-motion support, and a scoped tooltip with mobile positioning clearance. Other chart components in this folder are retained as upstream TypeScript and built by Vite.

The Cartesian renderer pauses via IntersectionObserver/document visibility. Reduced-motion charts stop scheduling frames after settling and wake on chart input or motion-preference changes. Normal-mode sparkles and hover effects remain active while visible. Check `design/verification/check_workspace_performance.mjs` for fixture-based rendering and refresh measurements.
