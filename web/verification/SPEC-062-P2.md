# SPEC-062 P2 / TASK-126 verification

Ready for integration review; P3 has not started. The root layout now sends shell only; request-local context/index feeds shared bounded Tasks/Specs/options, Overview and Timeline projectors. Board/cards are still the list presentation. SSR and no-store `/workspace-data` use the same envelope builder. `/workspace-options` searches/pages the catalog rather than shipping all titles.

Refresh uses an active-route controller with abort, generation/sequence ownership, 15-second deadline, envelope validation, atomic shell/data updates and visible previous-data/Retry state. It does not invoke SvelteKit invalidation or navigation. Details stay unregistered. Request keys describe URL intention before snapshot-dependent page/ID normalization; effective clamping and unavailable filters are explicit and announced, without rewriting the URL.

| Gate | Evidence | Result |
|---|---|---|
| Service/query/index tests | Canonical status/priority, archive/legacy, spec.taskIds metrics, Unicode, stable sort/ISO offsets/empty-last, page and option roundtrip, request reuse, no foreign derivations, bounded payloads | Passed |
| Independent service review | Astra: 300 graphs / 10,738 legacy summary comparisons; subsequent query/identity deltas independently rechecked | Approved subgroup; integration review pending |
| Full Bun suite | 279 passed, 0 failed, 5,393 expectations, 50 files | Passed |
| Bun coverage | Functions 90.49%, lines 91.04%; includes concurrent harness code and TS helpers, does not instrument Svelte UI | Passed instrumented scope; UI flows reported separately |
| Svelte check / build / AGENTS / whitespace | `bun run web:check`, `bun run --cwd web build`, `bun run check:agents`, `git diff --check` | Passed; 0 errors/0 warnings |
| Controlled refresh browser | `p2-refresh-browser-report.json`: four route successes; Tasks abort/503/JSON/key failure, Retry, focus+scroll, A→B, navigation generation, focus debounce, real 15 s timeout | 35 checks passed |
| Other route failure paths | `p2-routes-noscript-report.json`: Overview abort, Specs invalid JSON, Timeline malformed selection; exact prior pane and Retry; zero router requests/navigation | 9 checks passed |
| No-JS integration | Same report: page50 paging, option page2, off-page selections exactly once, visible native checkbox, Apply, search later catalog ID, retained filters, canonical detail | 12 checks passed |
| Changed-result refresh | `p2-changing-results-report.json`: page clamp/empty/reappearing page, focus removal announcement, missing/reappearing spec filters and preserved URL | 11 checks passed |
| Options ownership | `p2-options-browser-report.json`: delayed A/new B, selection retained, error/Retry, no list URL/data mutation | 5 checks passed |
| Real filesystem change / canonical POST | `p2-external-detail-report.json`: isolated fixture task title observed on refresh; no-JS question action writes/resolves answer and evaluates | 4 checks passed; both files restored byte-for-byte |
| Package content | `p2-package-audit.json`:141 files, required new source/endpoint files present, zero generated SvelteKit entries | Passed archive audit; new installed-runtime smoke deferred to P7 |

Total focused P2 browser assertions: 76. These include real browser behavior with controlled transport responses, explicitly isolated fixture writes, and no-JS navigation. The original 72-layout P1 matrix was not repeated. The shared shell verifier was updated for active P2 refresh; the historical P1 deferral regression remains a phase-specific record.

## Volume measurements

Apple M1 Pro, Darwin 25.2.0. Five warmups and 20 samples. Service timings use Bun 1.3.9; HTTP uses the Node/Vite development server and includes response headers/body. Process startup/JSON serialization are excluded from service timings, and OS filesystem cache is not forcibly cleared.

| Fixture / surface | Median | p95 | Payload |
|---|---:|---:|---:|
|10k tasks +2k specs,30k dependency entries; service maximum across Tasks/Specs |277.70ms |300.49ms |37,237B |
|10k all-open chain; service maximum across Tasks/Specs |259.42ms |301.61ms |35,486B |
| Current Tasks HTTP page100 including shell/options |468.41ms |557.46ms |37,279B |
| Current Specs HTTP page100 including shell/options |432.65ms |551.40ms |35,670B |

Here “Current” means the P2 route implementation running against the isolated 10k/2k fixture. Both route payloads include 100 rows and 50 options and satisfy 250 KiB; 100 cards were mounted. Service reports split filesystem/index/projection per sample. Their serial run preceded the small request-intent metadata delta; the HTTP report measures the current envelope including that metadata. The initial HTTP Tasks observation was 1.405 s, not an OS-cold p95. Concurrent volume/chain diagnostic runs are retained with `-concurrent` filenames and explicit contamination labels; they are not gate evidence.

Reproduce service measurements with `bun web/scripts/workspace-benchmark.ts volume 20 workspace --keep-fixture` and the chain variant without retention. The explicit retained disposable fixture enabled the HTTP/browser checks. HTTP command: `bun web/scripts/workspace-http-benchmark.ts http://127.0.0.1:5188` (the requested 5187 port was occupied and Vite selected 5188). Report: `p2-http-benchmark.json`.

## Boundaries and remaining work

No P2 acceptance failures remain in the collected checks. Fresh installed-package runtime smoke is not rerun here; P1's historical smoke and the current archive audit do not replace P7's final runtime check. Cold p95, initial-route JS transfer, leak/long-task budgets, full contrast/a11y/zoom/assistive-technology checks and complete table/drawer flows remain the later phase gates. Overview critical-path and Timeline volume algorithms are explicitly deferred; list timing does not credit those algorithms.

Astra corrected an incorrect premise in the P2 note: legacy detail GET returns HTTP 200 plus `found:false`, including at the pre-P2 checkpoint. P2 preserves that view and canonical question action. P4 must add coherent task/spec full-page HTTP 404 and an inspector-local missing state, tested on direct URL/client navigation/inspector.

No production project-memory files were changed by browser inspection. The question POST and external-file test used the disposable fixture only, restored to matching SHA-256 afterward. Parent owns task/spec/current state and review/commit transitions. Ignore-only housekeeping adds `/.playwright-mcp/`; durable `web/verification/` remains versioned.

## F126-1 / F126-2 review corrections

The selector now accepts fresh catalog seeds while preserving drafts, or reissues its last submitted query/page when that differs from the URL seed; text not yet submitted is never searched by refresh. URL/Clear reset keys reset all facet/search drafts, including Clear to the same URL. Late option responses/errors remain owned by request sequence.

`p2-filter-review-report.json` records 16 focused passing regressions after these fixes. Clear natively navigated once in the same-URL observation; that is permitted for ordinary GET navigation. The separate handler-isolation case prevents default navigation once to verify local reset/abort independently and does not claim a native no-navigation guarantee. Svelte check/build passed again. The prior service, HTTP and full Bun evidence is retained; those unaffected suites/matrices were not repeated.
