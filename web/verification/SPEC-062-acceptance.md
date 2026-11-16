# SPEC-062 — final acceptance tracker

Working tracker for TASK-131, not final certification. Earlier reports apply to their recorded source snapshots. Final product source, runtime and fixture identities must be recorded before closing this matrix. TASK-138 remains open for performance. TASK-129 is reviewed and committed as d761ccb; combined Timeline integration and final certification remain pending.

| Criterion | Existing evidence | Final verification still required | Status |
| --- | --- | --- | --- |
| AC01 — tables, Board, read-only inspection | P2/P3 table and bounded-query reports | Confirm combined Tasks/Specs defaults, Board filter preservation and unchanged fixture bytes for reads | Pending |
| AC02 — rail and active parent | Shell implementation and prior browser checks | Record final compact/expanded geometry, persistence and detail parent `aria-current` | Pending |
| AC03 — density, type and targets | P3 tables; P6 Timeline layout reports | Recheck affected final layouts at specified desktop/touch sizes | Pending |
| AC04 — contrast in both themes | P3/P6 contrast; TASK129 editor/dialog actual-state ratios and visual approval | Reuse unchanged pairs by hash; audit any final changed states/tokens | Pending |
| AC05 — deterministic URL queries | P2 query tests; Timeline core review | Final affected query tests and same-fixture/clock consistency | Pending |
| AC06 — selection and safe copy | P3 table/clipboard/browser evidence | Final affected table flows; visible column ordering and page-local identity selection | Pending |
| AC07 — inspect links/history/focus | P4 inspector; functional TASK138; TASK129 real navigation/history checks | Combined Timeline/page/drawer flows and group-opener fallback | Pending |
| AC08 — docking, modal and resize | P4 responsive/focus evidence | New question/leave dialog interactions, keyboard resize and final responsive behavior | Pending |
| AC09 — races, missing/error/retry | P4/TASK138 races; TASK129 real late-loader and fenced-remount checks | Reconcile hashes and verify affected combined consumer composition | Pending |
| AC10 — complete accessible details | Functional TASK138 bounded-window/GET reports | Confirm final reader/editor composition retains all content and relation access | Pending |
| AC11 — single guarded question mutation | TASK140 backend; TASK129 approved action and JS/no-JS recovery/conflict/guard matrix | Reuse frozen producer/editor evidence; verify combined Timeline transitions | Pending |
| AC12 — Timeline semantics and trace | P6 core parity, diagnostics and 67 browser checks | Combined138/129 integration plus final source delta checks | Pending |
| AC13 — performance and payload bounds | P2 payload checks; TASK138 exact-source timings | All final warm/cold/interaction/asset/memory budgets on registered10k/2k baseline | **Open FAIL on f8a7e1d: detail Task979.2ms / Spec504.3ms p95 exceeds300ms** |
| AC14 — tests, coverage and accessibility | TASK129 isolated444-pass suite,92.50%/93.60% Bun aggregate with scope limits; prior slices | Final combined suite, global coverage≥80% or explicitly agreed blocking deficit, zero serious/critical a11y violations and recorded manual review; assistive technology separately | Pending |
| AC15 — packaged runtime and guidance | Prior package checks; TASK138 archive audit; current AGENTS checks | Both workspace launch and prepared-package/global-style binary `spm ui` from a fresh external project; final assets and guidance check | Pending |

Reports: [P2 shared queries](SPEC-062-P2.md), [P3 tables](SPEC-062-P3.md), [P4 inspector](SPEC-062-P4.md), [P6 Timeline](SPEC-062-P6.md), [TASK138 detail](task138-verification.md), [TASK140 guarded writes](SPEC-062-TASK140.md), [TASK129 editor](task129-verification.md) and [final review](task129-final-review.md).

Keep passed, failed and not-run distinct. Bun instrumentation does not certify Svelte/browser behavior. An archive inventory is not an installed-package runtime smoke. HTTP timing is not hydrated navigation timing. Application/browser-cold measurements leave OS caches uncontrolled, as specified in TASK-131. No unavailable screen-reader environment may be counted as passed through axe results.

## AC13 metric ledger

All rows below await final combined source/runtime/fixture identification and linked raw evidence. Historical results remain attributed to their original reports. Use the shipped `spm ui` runtime for list measurements and the TASK131 hydrated-controls plus two-animation-frame end point. Five warmups and20 serial samples apply to warm timing series; cold uses its separate recorded protocol. Do not infer one metric from another.

| Metric | Existing specified threshold | Final evidence/status |
| --- | --- | --- |
| Tasks/Specs page payload | ≤250KiB uncompressed JSON for100 rows; no bodies or other-view datasets | Pending |
| Warm list navigation | Per-route p95≤800ms | Pending |
| Application/browser-cold list | Per-route p95≤2.5s; loading state visible if waiting>150ms; OS cache uncontrolled | Pending |
| Grid click/key handling | p95≤50ms | Pending |
| Sustained scroll | No main-thread task>100ms | Pending |
| Warm detail | Per-kind p95≤300ms; skeleton≤100ms when waiting | Latest f8a7e1d FAIL979.2/504.3ms; earlier359/326.1ms retained; final pending |
| Filter feedback/result | Local feedback≤100ms; server-result p95≤1s plus150ms debounce | Pending |
| Mounted data rows | Table≤200; virtual Timeline≤80 at reference viewport | Pending |
| Initial Tasks JavaScript | Revamp delta≤60KiB gzip against recorded baseline; Mermaid outside list chunk | Pending |
| Visual stability | Data changes/inspection do not unintentionally move toolbar or focused row outside viewport | Pending |
| Retention smoke |100 open/close/entity-change cycles; no accumulated listeners or retained growth>10MiB after harness GC | Pending |

## Fixture and evidence ledger

Record which earlier evidence remains valid and why; rerun affected final flows, not every historical matrix. The headline volume fixture alone does not certify graph edge cases, and every performance metric need not be repeated for every fixture.

| Prescribed fixture | Existing evidence to assess for reuse | Final reuse/rerun decision |
| --- | --- | --- |
| Actual-like182 documents | Baseline/shell and table reports | Pending |
|10k tasks /2k specs /30k links | Shared service benchmarks and Timeline reports; identify actual edge count per run | Pending |
|10k dependency chain | TASK136 oracle/iterative traversal and Timeline core tests | Pending |
| Cycles and missing references | Graph compatibility oracle and Timeline diagnostic tests | Pending |
| Empty/single/many rows and pathological text | Table, detail and Timeline browser evidence | Pending |

The final report must retain exact row-count predicates at1440×900/1280×720, visible TSV ordering/formula protection and Tasks/Specs/Timeline inspector entry routes. Packaged smoke may use an isolated prefix/bin arrangement without changing the user's global installation, but must record the actual shipped invocation and packaged assets used.

Latest detail gate: [post-memo browser report](task138-memo-browser-report.md), independently reviewed against its manifest. The single authorized copy-only diagnostic observes attribution and does not count as another acceptance run.
