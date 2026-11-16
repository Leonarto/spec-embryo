# SPEC-062 P6 — Timeline checkpoint

TASK-130 is frozen for final independent review. Core, presenters, group focus/live-region and final visuals have partial independent approvals; combined detail/question integration and the final browser timing series are now complete. Root owns final acceptance, task metadata and commits.

## Core and rendering

The workspace adapter calls the unchanged legacy Timeline projection once, then adds filtered-graph diagnostics, explicit finite/null units and a bounded fallback page. Only Timeline envelopes use schemaVersion2; other routes retain1. Iterative diagnostics preserve last-ID graph rules, declared edge occurrences, deterministic first100 samples per category and exact omitted counts. Missing references differ from dependencies outside the current view. No scheduler, dates or graph semantics changed.

The visual view uses one scrollport, adaptive1/2/5-power ticks and relative bars. Expanded logical IDs remain independent from the virtual window. Above500 task rows, the window uses overscan8 and pins focused occurrences in logical DOM order. Native list semantics expose total positions; simple/SSR uses the producer's semantic100-row page, selectable50/100/200. Coarse geometry is44px; desktop density is32/40 with40px group headers. Density is a validated versioned project preference; collapse is route-session memory.

Trace is separate from inspection. Six exact relationship counts and two related-spec counts come from the complete selection. Two50-ID pages preserve category/order, canonical links and GET reachability. Clear membership filters preserves trace/mode/inspection/presentation preferences; unavailable trace is explicitly labelled.

## Evidence collected

- Astra approved the seven-file core recorded in `task130-core-manifest.json`; `/private/tmp/spm-task130-core-review.md` is partial approval only.
- Eight independent virtual-view checks pass with10k tasks:25–34 mounted task rows,10ticks, finite CSS, native PageDown focus pinning, logical DOM order, Tab/ShiftTab, density anchor and collapse persistence through simple/visual switching.
- Nine real no-JS checks pass: semantic fallback100/200 rows, native GET paging, related IDs<=100 mounted, final-page GET exposing the final49 of1999 related specs, independent Clear behavior and honest unavailable trace. Final related-page reachability used an explicit page40 GET after verifying real Next; it did not perform39 redundant full-graph navigations.
- Three enhanced related-spec checks pass: full counts, final Next retaining disclosure/focus and independent Clear trace.
- Targeted suite:43tests /1453assertions /7files pass (Bun; not whole-repository coverage). AGENTS check passes.
- SSR presenter tests cover unavailable numeric cells/finite values/no nonfinite CSS and bounded ordered2000-related-spec final-page links. Early harness corrections are retained/explained separately; the final virtual report uses original focused-node identity and the actual sticky-header bottom as the anchor boundary.

## Historical isolated production checkpoint

`task130-production-closure.json` records exact base140f902 plus18 before/after/copy-verified overlay hashes in an isolated temporary checkout, existing dependencies and a successful production build. Its21-module closed-Timeline static closure excludes Detail/DocumentBody/Mermaid. Shared in-progress TASK-138 sources were excluded. Node preview5296 reads the retained synthetic10k-task/2k-spec fixture without writing it.

Five warmups/twenty serial samples, coordinated CPU windows:

| Measurement | Median ms | p95 ms |
| --- | ---: | ---: |
| Fresh filesystem/context |179.76|221.63|
| Revision/index from reused context |12.77|15.44|
| In-memory projection + validation |22.32|27.01|
| Selected-trace projection |31.10|35.72|
| Projection JSON serialization |8.41|10.44|
| Complete Node HTTP/download/parse |307.00|427.13|

The complete Timeline envelope is3,413,627bytes. This is a full-graph contract; the250KiB bounded-list limit does not apply. Phase percentiles are separate and cannot be added. The first filesystem observation is not an OS-cold p95.

Chromium157 production measurements: warm document navigation to visual mount plus two animation frames p95626.8ms; trusted Enter group-toggle keydown to two frames p9516.4ms. A separately scoped100-frame deep-scroll stress test observed no long task>100ms and mounted at most34 task rows. It used requestAnimationFrame-driven3000px jumps; it is not a physical-device/AT test. Raw sample arrays and methods are in `task130-layer-timing.json` and `task130-browser-timing.json`.

## Historical presenter checkpoint

The isolated presenter checkpoint now has67 passing browser checks: the earlier20, diagnostic UI4, layouts32, near-edge anchor4 and committed128-inspector baseline7. Eight actual-theme captures cover390/1280/1440/1920; primary title13px, desktop group24px and coarse group/Trace/ID/title44px targets were measured. Ruler/bar alignment and solid text contrast pass. The later sections retain pre-fix evidence, superseded by these final checks. Inspector baseline restoration/Next tests passed against committed128 and remain separated from shared TASK-138 implementation; the serialized navigationScope patch waits for138 ownership release. Final combined138/129 question-guard integration is mandatory before TASK-130 is done. OS-cold, detail300ms, final package/runtime, assistive-technology and leak gates remain with their explicit owning phases; none is inferred from these DOM or warm measurements.

## Presenter review corrections and invalid runs

Astra's partial presenter review approved the anchor clamp (40/44→32 retains the same occurrence at the last visible pixel) and primary13px typography/24px desktop group target. The focused follow-up suite passes7tests/419assertions; the earlier43-test checkpoint is retained rather than presented as a rerun after the delta. Native browser anchor/focus/scrollX follow-ups subsequently passed as recorded below.

A production coarse preflight found a real43px Trace hit area inside a44px bordered row. Explicit44px minimum height now covers Trace and ID/title inspection anchors; short-title anchors also retain44px minimum width. The before-fix result is preserved in task130-coarse-target-before-fix.json. The corrected final coarse/layout checks are recorded below.

The first layout attempt encountered a Vite error overlay during concurrent shared-source HMR and produced zero assertions; it is an invalid run, not a product finding/pass. An isolated production attempt then exposed a harness-only color spelling assumption (#fff versus #ffffff); assertions now use the actual computed background RGB and resolved theme. Final layouts run against a separate production checkout.

The final isolated presenter checkout includes exactly one frozen pure TASK138 module, detail-relations.ts at253637e79c253b8b5938e21c7fe2e4e5dfa932e1cfd758c2d8a5910cea2b32dc, for the approved parse/write relation-intent helpers. It contains no138 client/controller/resource/guard implementation. Full combined integration remains pending. The generic AnalysisFilters GET/Clear carry was delivered as a separate HEAD-only138 patch with two SSR tests/50assertions; the Timeline-specific Clear semantics remain in130.

## Final isolated functional checkpoint

The pointer-media44→32 last-pixel test retained the exact focused row node, key, query and horizontal scroll60; offset43 clamps31. Native density40→32 retained the row at offset39→31, scrollX60 and the actual density button focus. Seven committed128-inspector baseline checks passed collapse/re-expansion without reader remount or trace loss, opener unmount/materialization and Next across the virtual slice. These do not certify the new138transport/controller or129guard.

Final theme/target/contrast and anchor raw reports are task130-layouts-final-report.json and task130-anchor-report.json; task130-inspector-baseline-report.json records its explicit boundary. The final isolated build's18 overlay hashes and its static initial closure (no Detail/Mermaid) are in task130-final-production-closure.json. The earlier warm timing reports belong to the earlier18-source checkpoint; the final browser-only rerun for the presenter delta is recorded below. Filesystem/projection/serialization measurements remain valid for the unchanged approved core and will not be repeated without cause.

## Final combined source and integration

The final isolated checkout is archive d761ccb plus the Timeline overlay and the narrowly approved persistent announcement region in InspectorHost. It includes committed bounded detail transport and question guards. The server is supported Node25.6.0/Vite8.0.3 DEV on127.0.0.1:5313, not the older production-preview runtime. The immutable volume corpus contains10000 tasks,2000 specs,30000 edges and12001 documents (3113582 bytes); corpus digest0a7917cf23b94ec99d748dc79855148887ca85e48b06573397b3059f2d0225a8.

- Group opener restoration: four directed cases pass (connected, virtualized, collapsed and removed), with a modal follow-up checking focus and a unique connected announcement region after inert cleanup. Astra approved this exact source delta in task130-group-focus-manifest.json; the persistent status is separate from Copy link notices.
- Question/history integration: nine checks pass, including one real canonical POST, exact draft retention across trace/Keep editing, disabled pending actions, saved decision on reopen and Back/Discard/Forward without resurrecting a draft. Six refresh checks preserve trace intent, exact editor node/revision and draft through synthetic task removal/reappearance. The synthetic fixture was the only mutable corpus.
- Final light1440 and dark390 captures were independently approved without another UX change. Actual theme, input typography, editor readability and guard state are captured.
- The current combined targeted suite passes35 tests/1369 assertions; earlier broader checkpoints retain their original source scopes. This is not whole-repository or browser coverage.

The first POST observer missed a successful submission because a glob excluded the slash in the named-action query. Its retained invalid observer evidence is task130-editor-harness-first.json; a bounded exact-regex observer then completed the affected flow. No product change was made for that harness failure. A failed attempt to use dynamic import inside the browser tool failed before fixture mutation; subsequent fixture writes used the controlled external runner.

## Final browser-only measurement

One coordinated, fixed series used five warmups plus twenty measured native navigations, twenty trusted Enter group toggles after five warmups, and100 programmatic scroll frames. All warmups, twenty samples, outliers and endpoint states are retained in task130-final-render-report.json. Endpoints were timestamped inside the second browser animation frame after the expected hydrated state; navigation used new pages in the same warm-cache context.

| Measurement | Median ms | p95 ms | Result |
| --- | ---: | ---: | --- |
| Timeline native navigation to hydrated10000-task virtual view +2rAF |800.45|1341.70|Own metric; no Tasks/Specs800ms assertion |
| Trusted Enter group-toggle to changed rows +2rAF |9.20|12.60|Pass≤50ms |

The100-frame scroll series mounted at most34 task rows, had no captured long task and no nonfinite CSS. The≤80-row/≤100ms-long-task budget passes. Jumps used `(i+1)*7919 modulo scroll range`, one rAF each; this is not physical input or assistive-technology certification. The first dev warmup took10816.8ms and remains in the raw. There is no gain comparison against the older preview measurements. The Tasks/Specs navigation gates, detail300ms, final package/bin, retention and comprehensive accessibility acceptance remain with TASK-131/TASK-138; this checkpoint does not claim them.

Runtime source identity, fixture proof and launch command are in task130-final-source.json. No filesystem/projection/serialization benchmark was repeated for the unchanged approved core. The browser was closed and resources released immediately after the one fixed run.
