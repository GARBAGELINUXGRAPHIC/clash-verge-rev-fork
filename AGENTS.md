# Agent Guidelines

## Frontend Web Preview

Use the real application frontend for browser-based UI work. Do not create a
separate demo that duplicates pages or components.

- Start `pnpm web:preview` and open `http://127.0.0.1:3001/` in the in-app browser.
  If the pnpm launcher is unavailable, run
  `node_modules/.bin/vite --mode web-preview --host 127.0.0.1 --port 3001 --strictPort`.
- This starts Vite only. Do not compile Rust, launch Tauri, start Mihomo, or
  connect to the user's running Clash Verge for visual previews.
- `src/bootstrap.ts` loads `src/web-preview/setup.ts` before the real `main.tsx`
  only in development, outside Tauri, when Vite runs in `web-preview` mode.
  An existing regular Vite server can also opt in via `/?web-preview`; use the
  dedicated mode for reloads and direct routes because routing removes the query.
- The adapter uses Tauri's `mockIPC` and `mockWindows`. Fixtures and supported
  configuration/selection changes live in memory and reset on reload. Application
  UI preferences may still use the browser's local storage.
- IPC never falls through to a native backend. Unsupported commands reject with
  a `Web preview:` error. Extend the adapter for needed interactions rather than
  changing production components or returning success for unsupported actions.
- Preview data is synthetic. This tool validates UI, not actual proxy routing,
  service installation, file operations, updates, or network performance.
- Verify the real proxy and settings pages, light/dark appearance, and browser
  console after changes. Keep the preview tab open as the deliverable.
- Preserve existing icons and interactions when the requested work is styling
  only. Keep unrelated performance/repaint changes separate.
