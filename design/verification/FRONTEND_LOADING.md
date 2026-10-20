# Frontend loading pass — 2026-10-20

The source optimization was frontend-only, with no backend or account behavior changes. It was subsequently deployed from `c37fb248a69ac485f0e099dd75c2ebf934b3fdb7` through the existing release workflow. See [live release verification](LIVE_RELEASE.md) for deployment evidence; the measurements below remain local benchmarks.

## Changes

- Login/register/recovery and Landing use separate lazy chunks. Signed-in Home does not request either public screen or their shared stylesheet.
- A requested public screen starts loading alongside session restoration. The existing restoration view remains visible during the transition until its chunk is ready. Expiry-to-login retains a loading fallback. Authentication errors, retry and workspace gating remain intact.
- Converted the four application font files from TTF to WOFF2 without subsetting. Native `woff2_compress` and `fc-scan` verified identical family/style, weight and complete character sets against the retained originals. Vietnamese coverage is preserved. All three Barlow weights are used and remain available.
- Removed raw TTF copies from the shipped public directory. Original fonts and their licenses remain under `design/fonts`; the public font licenses are also retained. Older HTML previews now use the design copies.
- The isolated dashboard preview server reuses installed frontend dependencies by default instead of requiring a vanished temporary dependency folder. Its existing override remains supported; no new dependencies were added.

## Sizes and cold-load measurements

| Measurement | Before | After |
| --- | ---: | ---: |
| Entry JavaScript, uncompressed | 216,296 B | 203,070 B |
| Entry stylesheet, uncompressed | 42,764 B | 35,776 B |
| Four application font files | 332,728 B | 132,736 B |
| Font response bodies on cold Home | 367,656 B | 167,664 B |
| All JavaScript response bodies on cold Home | 553,364 B | 542,920 B |
| Median Home figures/fonts ready | 6,290 ms | 5,103 ms |

Font files are 60% smaller; Home font response volume fell 54%. Entry JavaScript fell 6%, while all JavaScript needed for Home fell about 2% because the dashboard and workspace still load. The entry CSS saving moves public styles into an on-demand chunk rather than deleting them.

Home readiness improved about 19% in three cold isolated contexts per build at 1440×900, with 4× CPU slowdown, 80 ms simulated latency and 200,000 B/s download throughput. Readiness is recorded in-page after figures appear and fonts settle, excluding automation polling delays. Calendar time is fixed without mocking native Performance/Resource Timing. API data is intercepted fixtures. Response sizes are decoded bodies, not gzip transfer costs. These local measurements are not a production latency guarantee.

Single unthrottled local samples: Login 100→124 ms, Landing 117→137 ms. Their extra chunk requests have a small initial-load cost; font bodies fell from 199,856 B to 101,968 B. Those single samples are not enough to claim a public-page speed improvement.

## Verification

- Frontend lint, 11 test files, account-mode production build and diff checks passed.
- Compared 96 page/dialog states across desktop/mobile, light/dark and sidebar/navbar. 94 were pixel-identical; the other two differed at five border pixels in total, by at most one RGB level. No layout/typography difference remained.
- After the final restoration adjustment, rechecked all 24 public-page states: 20 were pixel-identical; four login borders differed at 16 pixels in total by one RGB level. No layout or text difference.
- The saved loading check confirms public chunks are absent from Home, each public route fetches its own chunk, font requests use compressed files, and Vietnamese text can load in every retained weight.
- Slow auth-chunk loading, session expiry → login → Home, account-service failure privacy gating and reload retry passed with fixtures.
- Archived preview font references resolve. The isolated preview server starts successfully and serves its retained fonts with HTTP 200.

Results: `/tmp/pomogit-frontend-loading/before.json` and `after.json`. Screenshots: `/tmp/pomogit-cleanup-loading-before/`, `loading-after/` and `loading-public-final/`. These temporary artifacts are not committed. No personal browser profile or live account API was used.

To repeat the current-build regression check, build in account mode, serve only `frontend/dist` on localhost, then run:

```sh
POMOGIT_APP_URL=http://127.0.0.1:5195 node design/verification/check_frontend_loading.mjs
```

Set `POMOGIT_PLAYWRIGHT_MODULE` if Playwright is installed outside the repository. Existing installed browser tooling is reused; no application dependency is needed for this check.
