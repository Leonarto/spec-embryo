# SPEC-062 P0/P1 verification

P1 implements solid workspace tokens, shared icon buttons/view headings, the compact responsive shell, persisted navigation, theme controls, and a two-column Overview. Tasks remains the existing board; Specs and Timeline bodies remain their existing views until P3/P5/P6. No query or detail service changed in this slice. Product decisions and review gates remain in SPEC-062.

## Baseline

Baseline source checkpoint: `fa025f2`. Browser baseline captured before product edits on 2026-11-15, Chromium 157.0.8103.78, 1440×900, system resolving light. The six `spec062-baseline-{0..5}.png` files correspond respectively to Overview, Tasks, Specs, Timeline, `/tasks/TASK-115`, and `/specs/SPEC-057`.

| Route | Navigation | Context header | DOM elements | One dev navigation TTFB (ms) |
|---|---:|---:|---:|---:|
| Overview | 252 px | 141.05 px | 533 | 363.60 |
| Tasks | 252 px | 141.05 px | 3678 | 402.90 |
| Specs | 252 px | 141.05 px | 2894 | 376.10 |
| Timeline | 252 px | 141.05 px | 1207 | 194.80 |
| Task detail | 252 px | 141.05 px | 316 | 357.80 |
| Spec detail | 252 px | 141.05 px | 392 | 379.00 |

These browser timings are illustrative single dev navigations, not a production latency percentile. The baseline working tree was already dirty, and project memory changed as the authorized parallel implementation tasks were established. Browser screenshots contain that real memory state.

## Service benchmark

Run `bun web/scripts/workspace-benchmark.ts <current|actual-like|volume|chain|diagnostics> [sample-count]`. Generated documents live only in disposable temporary directories and use canonical `initializeProject` configuration plus deterministic frontmatter. The fixture builder removes temporary data on completion/failure. Each service invocation has a 10-second subprocess limit.

Hardware: Apple M1 Pro, Darwin 25.2.0, Bun 1.3.9, local filesystem. Five warmup invocations, then 20 samples in fresh processes; timings exclude process startup and JSON serialization, and OS filesystem caches remain warm. `processFirstReadMs` is the first invocation, **not** verified OS-cold disk. Cold p95 and production route timings remain P7 work.

| Dataset | Shape | Result |
|---|---|---|
| current | Actual repo at measurement time | See `benchmark-current.json` |
| actual-like | 122 tasks + 60 specs (182 docs) | See `benchmark-actual-like.json` |
| volume | 10,000 tasks + 2,000 specs; 30,000 dependency entries, bounded-depth DAG | First invocation exceeded 10 s; no successful warm samples |
| chain | 10,000 tasks + 2,000 specs; all-open forward chain of 10,000 | First invocation exceeded 10 s; no successful warm samples |
| diagnostics | 6 tasks + 2 specs; cycle and missing reference | See `benchmark-diagnostics.json` |

The volume and chain failures are an explicit baseline, not a waived performance gate. The current facade derives all views, repeats task-neighborhood scans, and computes critical paths/timeline even when only a list is needed. P2 must introduce bounded projections with a shared adjacency index; P6 handles timeline/graph scaling. P7 cannot pass while those budgets fail. The earlier unbounded profiling attempt was terminated and replaced with this bounded harness; no successful percentile is inferred from a timeout.

## Browser checks

`web/scripts/workspace-browser-check.mjs` exports `verifyWorkspaceShell(page, { baseURL, evidenceDir })` for a Playwright page. The connected browser runner loads the exported function body and invokes it; no new production dependency is required. The report is `p1-browser-report.json`.

- The initial run passed 227 assertions over 72 route/theme/viewport combinations: six routes × dark/light/system × 1440×900, 1280×720, 768×900, 390×844.
- Rail is 56 px collapsed and 184 px expanded at root 16 px; reload preserves preference. Tablet forces compact and mobile uses horizontal header navigation.
- Global context header is 44 px on every combination. No document-level horizontal overflow; detail routes activate their parent with `aria-current`.
- Keyboard theme selection, Escape dismissal/return to trigger, OS theme changes, reduced motion, useful no-JS route content, and blocked-storage preferences passed.
- JS-only controls remain disabled until mounting initializes preferences. This prevents an early click from racing the preference initialization.
- `p1-{theme}-{width}-{route-index}.png` contains 22 screenshots: Overview in every combination plus the other five routes at 1440 in light/dark. Route index matches the baseline order.

Axe 4.10.3 was loaded for the audit from the pinned CDN distribution, with WCAG2 A/AA, WCAG2.1 AA, WCAG2.2 AA tags. `p1-axe-report.json`: zero violations in six routes × both themes. Shell/Overview and task detail had no incomplete checks. Specs and spec detail include contrast checks requiring manual follow-up; no screen reader certification is implied.

The additional DOM contrast audit checks text over solid composed backgrounds. Shell and Overview have zero skipped elements and zero failures. Legacy gradients in Tasks (134 skipped text elements), Specs (158), Timeline (177), and Spec detail (1) are deliberately reported as skipped. Per Astra's P1 scope decision these remain concrete P3/P5/P6/P4 migration work; global contrast is **not** certified. VoiceOver/Safari, NVDA/Firefox, high-contrast mode, and 200% zoom remain P7/manual environment work.

## Review correction: controlled refresh deferred to P2

Astra found that the initial success-path refresh check did not cover SvelteKit failure behavior. Aborting `**/__data.json*` while clicking Refresh triggered two aborted requests and a full navigation; the shell catch could not retain data, scroll, or the error announcement. The earlier `Manual refresh announces completion` assertion in `p1-browser-report.json` is historical success-path evidence only and is superseded by this review finding.

Astra's explicit scope decision moved the new Refresh surface to TASK-126. P1 now removes the button, `invalidateAll`, its ineffective catch/status, and its busy state. No parallel endpoint or view-state facade was introduced. Browser reload remains the ordinary way to reload P1 data; P1 makes no promise of in-place refresh or retaining state across a failed reload.

TASK-126 must implement controlled refresh on the new shared DTO/request context: retain last rows and current focus/scroll, discard stale responses, show a visible previous-data/error status, and retry without SvelteKit's navigation fallback. Both success and network/server failure require regression tests before that control returns.

`verifyRefreshDeferral` in the browser script ran a focused follow-up, without repeating the original 72-layout suite: 72 assertions over 22 affected screenshot layouts plus preference/network/scroll checks. All passed. It regenerated all 22 P1 screenshots, verified the refresh surface is absent, preserved the 44 px header and no document overflow, then blocked SvelteKit data requests while interacting with preferences: zero requests, zero full navigation, unchanged URL/view identity/scroll, and Escape restored focus. This tests the retired surface and shell stability, not an implemented failure-preserving refresh transport. Results: `p1-refresh-review-regression.json`.

Focused Svelte/theme/preference/Mermaid checks and the build/AGENTS checks were rerun after the correction. The previous full Bun coverage run remains valid for unchanged TypeScript helpers; Svelte is outside Bun instrumentation as stated below.

## Build, tests, package

- `bun run web:check`: 0 errors, 0 warnings.
- `bun test --coverage`: 202 passed, 0 failed; 42 files, 1,283 expectations; Bun function coverage 91.97%, line coverage 90.81%. This concurrent workspace run includes harness work and does not instrument Svelte browser code. UI flow coverage is represented separately above.
- Focused theme, Mermaid theme, and workspace preference tests: 7 passed, 0 failed.
- `bun run check:agents`: passed, 20 instruction files after adding this evidence guidance; web workspace chain below 2,200 tokens. Root policy unchanged.
- `bun run --cwd web build`: passed. `build-baseline.json` and `build-p1.json` record all emitted JS gzip bytes, including lazy Mermaid. This is explicitly not an initial Tasks transfer measurement; that budget remains a P7 production measurement.
- `git diff --check`: passed.

Prepared package smoke (recorded before the later removal of the Refresh control, with no subsequent packaging-structure change) used `bun pm pack --destination /private/tmp/spec062-package-smoke`, extracted the 114-file tarball under a simulated global `node_modules/@leonarto/spec-embryo` installation, and initialized an isolated external project. The archive contains zero `.svelte-kit` paths. Dependency directories were copied into the temporary install (symlinks to the development tree initially produced an artificial Vite filesystem 403 and were replaced).

From that external project, `bun <installed-package>/src/index.ts ui --port 5185` regenerated missing SvelteKit state and served fixture data. Browser Tasks → expand rail → Specs passed with 184 px rail, working client navigation, and no page errors. Direct Tasks, Specs, Timeline, and spec detail returned 200 with expected styles. Building the extracted package also passed. Vite prints a nonfatal dependency-scan warning about virtual Svelte imports under `node_modules`; browser hydration/styles/navigation still succeed. No package was published and no global install was modified.

Generated `web/.svelte-kit/` is now ignored. Parent owns removing the previously tracked generated entries from the index at the P1 commit; source sync/dev/build recreates them. No generated output belongs in this change's source manifest.
