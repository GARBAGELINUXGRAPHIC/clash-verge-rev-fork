# Frontend regression tests

These tests open the **real application** in Vite's `web-preview` mode. They do
not compile Rust, run Tauri/Mihomo, or connect to an installed Clash Verge.
The preview adapter owns synthetic IPC data. Every test has a fresh browser
context; a reload resets the adapter's in-memory state. Unsupported native
commands must reject. External HTTP requests fail the test.

## Run

```sh
pnpm exec playwright install chromium webkit
pnpm test:frontend
pnpm test:frontend --project=webkit
pnpm test:frontend:ui
pnpm test:frontend:typecheck
pnpm exec playwright show-report
```

Playwright starts `pnpm web:preview` on `127.0.0.1:3001`. Locally it may reuse
the existing preview, which must be this checkout running in `web-preview` mode.
CI always starts its own server. Keep pnpm at `11.28.3`.

## Coverage

61 scenarios run in both engines (122 browser checks), alongside the existing
Vitest suite and new shared-search unit tests.

| Surface | Assertions |
| --- | --- |
| All seven main pages | Direct routes, navigation, titles, runtime errors, horizontal overflow, reachable header actions; 350/800/1280px in light/dark, Chromium/WebKit |
| Subscription layout | First/last card bounds and shadow against clipping ancestors, real hover zoom, reduced motion, grid column behavior through 2800px |
| Settings | Readable primary labels, primary subscription text contrast >= 4.5:1 in light/dark, persisted switches/selects, keyboard selection, Escape/outside dismissal, rapid popup reversal |
| Dialogs and scrolling | Small-window bounds, focus trap/restore, wheel scrolling, draggable page scrollbar, modal scrollbar layering and restoration |
| Proxies | Mode switching, independent node selection, group collapse/expand |
| Subscriptions | Create/edit/activate/refresh/delete, cancel and validation without mutation |
| Rules/logs/connections | Search, case/whole-word toggles, clearing, invalid-regex recovery, severity/order/pause, table/list switching, details and empty states |
| Unlock tests | Single/all result updates and local-storage persistence |
| Preview boundary | Unsupported native commands reject; no external HTTP requests |
| Shared search logic | Literal/regex/case/whole-word behavior, escaped punctuation, Chinese text, invalid regex recovery (Vitest) |

Layout checks wait for fonts, finite animations and two frames. Assertions use
rendered geometry and observable user behavior. They do not require particular
Emotion class names or compare source code strings. Shadows are checked with
their computed offset/blur so adding a clipping wrapper is detected even if
the card's untransformed layout box still fits.

Zero automatic retries are configured: a flaky test fails instead of being
hidden by a retry. Failed tests retain screenshots, traces and the HTML report;
console warnings are attached separately. CI runs this suite on pull requests
and pushes to `personal-fork` and uploads failure artifacts for 14 days.

## Maintenance

For a new page/control, add an observable behavior test. For a visual regression,
add a geometry/readability/interaction invariant that fails with the regression
reintroduced. Inspect failure traces before changing an assertion. Update an
assertion only when the intended product behavior changes.

This suite validates frontend behavior against synthetic data. Actual proxy
routing, native dialogs/files, service installation, update delivery and network
performance require separate integration tests. WebKit coverage is useful for
engine differences; it is not a full test of the system WKWebView/Tauri host.
