# SPEC-062 P3 — Tasks Table

TASK-127 review freeze, 2026-11-15. Parent owns managed-memory status and commits. No P4 inspector behavior is implemented here.

Tasks now default to a server-paginated Table with real canonical links and an optional unarchived Board. The generic table owns current-page grid mechanics only; typed descriptors provide display, sort keys and TSV values. Native SSR/simple output remains a semantic table. Versioned project/kind preferences guard storage failures, keep identity columns locked and distinguish automatic title sizing from explicit widths.

## Validation

| Gate | Result | Evidence |
|---|---|---|
| Pure navigation/ranges/reconciliation/max-two-sort/preferences/TSV | PASS | `tests/data-table.test.ts`, 8 focused tests |
| Query/Table/Board/simple and opaque canonical project identity | PASS | workspace query/resource/service tests; latest identity-focused run14pass/108expects |
| Full Bun suite and coverage | PASS |333pass,0fail,7035expects,56files;91.43%functions/91.80%lines |
| Svelte/TypeScript check | PASS |0errors/0warnings |
| Production build | PASS | `bun run --cwd web build` |
| AGENTS budgets and whitespace | PASS | `bun run check:agents`, `git diff --check`; data-table chain2103/2200 |
| Browser interaction/themes | PASS after review fixes |69 retained non-layout checks +12 focused regressions +18 corrected layout/theme checks;99 total |
| Production-snapshot SSR/HTTP/import closure | PASS |159checks, `task127-http-report.{json,md}` |

Bun coverage covers instrumented root services and pure helpers, not Svelte/browser coverage. The full suite preceded strengthening the identity fixture to use two roots with the same basename; the latest focused14-test run passes that stronger case. No production source changed after that identity-fixture strengthening. Existing P2 performance evidence remains applicable to the bounded query foundations; this phase claims no new cold/latency/transfer budget certification. The installed-package runtime smoke remains P7.

Current browser phases: core23,copy7,columns9,refresh7,refresh-empty4,fallback10,corrected layouts18,touch4,controls5,review-fixes12. The original12-check layouts claim is superseded, not counted again. Reports include Chromium157.0.8103.78 and timestamps. Invoke `verifyTaskTable(page,{phase,baseURL,evidenceDir,axePath})` from `web/scripts/task-table-check.mjs` with a supplied Playwright page; `layouts` optionally loads an explicitly supplied local axe script. This run used axe4.10.3 retained from P1.

Checks cover one grid Tab target; native checkbox/sort activation once; header/page-bound movement, Tab exit and F6; range selection and page-only select-all; visible focus after sort/scroll; exact refresh focus/scroll preservation; vanished rows/empty lists/page clamping; selected-visible TSV/IDs and focused-cell copy; native selected-text/input copy; denied clipboard fallback; numeric and pointer sizing; auto/explicit/reset; keyboard hide/reorder; stable focus-column mapping; sort-menu equivalence; real middle-click canonical navigation; presets/debounced replace-history; simple mode; real JavaScript-disabled GET sort/Apply/Clear. Clipboard success/denial uses a deterministic browser API stub to inspect text and exercise denial; it does not certify OS clipboard permissions.

The real repository was inspected read-only. Volume browser checks use the retained P2 disposable10k-task/2k-spec fixture on5188; canonical project on5184 remains available. The independent HTTP helper uses its own temporary production snapshot/fixture and records155 source hashes, plus explicitly labeled later presentation deltas. Its159 checks do not claim browser/no-JS execution. Neither flow writes canonical project-memory documents.

## Layout and accessibility

- Both themes show19 complete rows at1440×900 and14 at1280×720, compact row32px and primary text13px; no document overflow. Fixture states include Todo, Blocked and Done. Comfortable rows40px are separately checked.
- Touch uses44px selection track/checkbox and controls without persisting the desktop36px track. Columns/Filters panels remain within390px and768px viewports, scroll internally, and nested facets remain usable.
- Solid-surface text audit: Table1441nodes and Board577nodes per theme, zero failures and zero skipped backgrounds. Board reuses solid semantic aliases and body typography.
- Axe WCAG2A/AA/2.1AA: zero violations for Table and Board in both themes. Axe marks seven Table contrast nodes incomplete; the separate solid-surface audit reports its scope explicitly. This is not a global accessibility certification or a screen-reader test.

Durable final captures: `task127-{light,dark}-{1440,1280}.png`, `task127-board-{light,dark}.png`, `task127-touch-{columns,filters}.png`, `task127-no-js.png`, and `task127-clipboard-denied.png`. `first-*` and `1440-light-mixed` are early review previews, not row-budget evidence.

## Harness corrections and boundaries

One numeric-width check exposed Enter blurring to the document body; Enter now commits width while keeping focus, so Escape restores the Columns trigger. Test-only corrections narrowed a whitespace-sensitive Status locator, used the browser-context new-page event for middle-click, and expected Clear's existing default100page size. The desktop/Board audit completed before that Status locator timeout; touch was split and passed independently. None remains an unresolved product failure.

Missing-detail HTTP404, persistent inspector/draft guards, Specs Table/questions, Timeline virtualization, full zoom/screen-reader/leak/long-task/package checks remain their explicit P4–P7 gates. Tasks/Board contrast debt from P1 is now covered for this phase's measured solid surfaces; Specs/Timeline legacy contrast is still outside this report.

Product and browser lease are frozen; `browser_close` executed. Servers5184/5188 remain running for independent review. Exact source/evidence SHA-256 values are in `task127-manifest.json` (the manifest itself is intentionally excluded from its own hash list).

## Review corrections F127-1–3

Enter now activates a row/header checkbox once only in enhanced-grid mode; native Space/Shift+Space and simple semantics remain intact. SSR/pre-hydration shows a readable preset label, with the selector mounted only after JavaScript is ready. Twelve focused real-browser regressions pass, including no-JS status/scope GET facets. The22 relevant Bun tests pass185assertions and Svelte check remains0errors/0warnings. Existing broader tests/build/HTTP checkpoint evidence is retained, not rerun for these two bounded fixes.

The original dark captures were light and their dark PASS claims were unsupported. Those original six captures and raw layout report are preserved with `superseded-` prefixes. Corrected layout evidence uses a fresh browser context and real theme controls, then asserts resolved `dataset.theme`, `dataset.colorMode`, `--surface` and computed cell/card background before every capture/audit. Light is#ffffff/rgb(255,255,255); dark is#151b1e/rgb(21,27,30). A storage+reload probe unexpectedly found system restored before application startup; no product theme change was made to accommodate it.

The old audit also counted unpainted descendants of closed details. Corrected visibility excludes content beneath any closed details outside its summary, producing the revised1441/577node counts. Eighteen corrected layout/theme checks pass, including both-theme axe and solid-surface contrast with zero failures/skipped backgrounds. This replaces the prior12 layout checks;69 unaffected checks remain retained and12 new review regressions pass. No81-case rerun was performed. Browser lease is closed again for independent recheck.
