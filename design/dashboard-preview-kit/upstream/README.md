# Dither Kit preview snapshot

Source registries retrieved for this preview:

- https://www.tripwire.sh/r/core.json
- https://www.tripwire.sh/r/area-chart.json
- Component documentation: https://www.tripwire.sh/dither-kit

The preview uses the upstream AreaChart, LineChart, Area, Line, XAxis, YAxis,
Legend and Tooltip components, including their canvas gradient renderer and aura bloom.
The application does not import this directory.

Local integration adjustments:

- Legend buttons expose selection with aria-pressed.
- Tooltip movement respects reduced motion and exposes a scoped styling class.
- Tooltip positioning reserves space for the project labels on narrow screens.

The generated dashboard-kit-utilities.css supplies the upstream Tailwind utility
classes within the standalone preview. Preview dependencies are installed outside
application package files; see ../../verification/DASHBOARD_REVIEW.md.
