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

## Merging Guidelines

- pull the latest dev, find the latest tagged release of dev (Check https://github.com/clash-verge-rev/clash-verge-rev/releases), merge it to personal-fork.
- When all other decidable changes are completed and there are still changes that you don't know which to preserve, notify the user.
- Do not set pnpm to anything newer than `11.28.3`. Keep it at `11.28.3` since there is no pnpm 12+ for MacOS yet.

## Contribution Guidelines

These rules apply to every change, whether human- or agent-authored. They match
the ownership evidence the AI-slop review evaluates (see
[`pr-ai-slop-review.md`](.github/workflows/pr-ai-slop-review.md)).

1. **Issue first.** Product bug fixes and features require a pre-existing issue;
   self-scoped maintenance work does not. Follow the PR template for linkage and
   revert references. If a required issue is missing, ask maintainers to open or
   approve one before implementing. For security-sensitive fixes that cannot be
   tracked publicly, follow maintainer-approved private tracking.
2. **Scope discipline.** Every changed file must be justifiable from the linked
   issue or the stated PR scope. No drive-by refactors, renames, formatting
   churn, or dependency bumps unrelated to the work.
3. **Author accountability.** AI assistance is welcome, but the contributor owns
   the result: understand the change, describe the problem and approach in your
   own words, and verify the change against the reported behavior before
   submitting.
4. **Tests are justified, not default.** Do not add tests, test scaffolding, or
   speculative defensive code unless the linked issue or stated task demands
   them. When a test is genuinely necessary — it reproduces the reported
   regression or guards behavior whose breakage would otherwise go unnoticed —
   keep it minimal and state in the PR body why it is needed. Bulk test files
   and defensive programming for hypothetical failure modes are PR bloat, not
   rigor.
5. **Comments state constraints, not narration.** Write a comment only for a
   non-obvious constraint the code cannot express; never restate what the code
   does.
6. **Language and commits.** Code, comments, commit messages, and PR text are in
   English. Commit subjects follow Conventional Commits (e.g. `fix(sysproxy): …`).
7. **No performative artifacts.** Do not add verification checklists, "Testing"
   filler, or mechanical commit splitting to satisfy review tooling. Provide
   real evidence instead: reproduction steps, failure output, targeted tests.
8. **Minimal diffs.** Match the surrounding code's style, naming, and comment
   density. Do not introduce new dependencies or restructure working code unless
   the linked issue or stated task demands it.
9. **Disclose AI automation.** When an agent creates or co-creates a PR or Issue,
   append a final body line with the model and effort used (e.g.
   `Assisted by: GPT-5.6 High`). Effort may be omitted when the runtime does not
   report it. Human contributors are not asked to disclose AI assistance.
   Disclosure is transparency only and carries no positive or negative weight.
10. **Compiled workflows.** The AI-slop review policy in
    [pr-ai-slop-review.md](.github/workflows/pr-ai-slop-review.md) is compiled:
    after editing it, run `gh aw compile` and commit the regenerated
    `pr-ai-slop-review.lock.yml`. Never edit the lock file directly.
11. **Changelog.** Entries follow the rules in
    [`template/Changelog.md`](template/Changelog.md): one line per
    user-visible change, no internals.

## Issue and PR Workflows

When drafting, triaging, splitting, or implementing from a community issue, use
the conditional checklist in [`.github/ISSUE_GUIDELINES.md`](.github/ISSUE_GUIDELINES.md).
Do not make GitHub issue changes without explicit authorization. For PRs, follow
the directly loaded [PR template](.github/PULL_REQUEST_TEMPLATE.md); do not
duplicate its prompts here.
