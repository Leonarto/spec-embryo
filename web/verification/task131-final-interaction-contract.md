# TASK131 finite interaction evidence contract

Astra decision for the missing AC13 helper. Authorizes isolated helper/unit-test preparation only. No product change, framework, runtime launch, browser lease or measurement window is authorized by this document. Root authorizes the actual finite window only after source review, a tiny smoke and the harness commit.

## Ownership and inputs

Sol owns only `web/scripts/acceptance-interactions.mjs` and `tests/acceptance-interactions.test.ts`. H retains runtime/navigation/retention/detail collectors and final orchestration. Helpers receive existing public Playwright objects and explicit immutable route/query oracles; they do not discover private modules, launch processes, generate fixtures, change product state APIs or choose retries. H owns browser/context/page cleanup and fixture/runtime identity. Every installed listener/observer owned by this helper is removed in finally.

The fixture/oracle input identifies route, exact URL, page size, ordered row IDs/count, total matching, two distinct search queries with their exact expected results, and stable opener IDs. Derive these expectations before measurement. Use committed abf426c application bytes/build698bfe, the registered browser/machine/viewport and actual compiled `spm ui` runtime. No query or sample is selected after seeing latency. Do not treat the historical fan-out corpus as a 30k-edge fixture without counting its actual graph.

Run interactions in a separate phase on warmed pages. Do not insert them inside warm/cold navigation or detail timing intervals. No forced GC, network/CPU throttling, response mocking or production instrumentation. CDP GC remains exclusive to H's retention phase.

## Fixed per-route local interactions

Tasks and Specs are separate results, never pooled. For each route use five warmups and twenty measured samples per event family; preserve warmup rows and every measured observation/error. Endpoint clocks live in the browser, not tool round trips. Record trusted event type, isTrusted, event timestamp, capture time, state-completion time and frame endpoint. Validate that timestamps share the page monotonic origin. Invalid/missing/untrusted events fail the observation; do not manufacture replacements.

- Keyboard family: alternate ArrowDown/ArrowUp between two known visible data rows in the same column. Start at the trusted keydown timestamp. End at the first animation-frame callback that observes the exact expected active row/column and roving tabindex state. The action must change focus, not hit a boundary. p95 nearest rank 19/20 must be <=50 ms.
- Click family: alternate selecting/deselecting one known visible row via its real checkbox. Start at the trusted click timestamp. End at the first animation frame observing the expected checked state and matching row aria-selected state. p95 nearest rank 19/20 must be <=50 ms. This is grid handling, not inspector latency.

Preparation/focus positioning and cleanup occur outside each interval. This local first-frame endpoint is deliberately distinct from the already approved navigation/detail two-frame endpoint; do not change those collectors.

## Search feedback and accepted results

Per route alternate the two predetermined distinct query oracles, five warmups plus twenty measured changes. Use trusted browser editing/typing (for example selecting existing text then keyboard.insertText), with real beforeinput/input events. No value assignment followed by dispatchEvent. Install the observation before the action and verify the final query was actually entered.

- Local feedback: trusted beforeinput timestamp through the first animation frame where the visible search control contains the intended value. Every measured feedback observation must be <=100 ms; report median/p95/max as supplementary values. Checking only the input event's already changed value without a frame is insufficient.
- Accepted server result: last trusted input timestamp through URL query identity, exact ordered expected IDs/count/total, hydrated grid controls and two animation frames. Per-route p95 must be <=1150 ms: the original 1000 ms result budget plus the specified fixed 150 ms debounce. Do not subtract the observed request delay or restart the clock at requestStart, responseStart or URL change. Record actual input-to-matching-request delay and HTTP timing separately; the source's configured debounce remains 150 ms, without pretending timer scheduling is exact.

A stale result with the right row count is not ready. Empty expected results require their visible empty state plus the hydrated shell/control predicate, not a nonexistent row. Use oracles with distinct query/result identities to prevent stale DOM acceptance. Preserve all failures/timeouts and any superseded requests; do not retry slow samples.

## Sustained scroll and mounted rows

For each route use the pageSize200 oracle and one settled preparatory traversal. Then perform one fixed ten-second sustained wheel interval over the actual table scrollport, reversing at its real bounds. Keep raw duration, wheel count, actual scroll positions/events and all observed main-thread long-task entries. Install a supported PerformanceObserver for longtask before the interval, without buffered navigation entries; include every task overlapping the interval and settling frames. Unsupported observation, zero real scrolling or failed cleanup is not PASS. Gate: no main-thread task >100 ms. This is a maximum, not a percentile or another twenty-run series.

Track actual mounted data-row maximum during that interval and the other interaction phases; table maximum remains <=200. Exclude header/status/empty rows by the existing data-entity-id contract. No injected rows or JS scrollTop substitute for the wheel action. Timing the scroll itself has no new budget. The separate virtual Timeline <=80 gate may reuse its already reviewed high-volume evidence when source/layout hashes agree; the normal <=500 small fixture is not that evidence. H must make that reuse decision explicit or schedule one missing bounded check, not repeat the Timeline matrix.

## Payload and visual stability

- One real public `/workspace-data` response per route for its pageSize100 oracle, outside latency intervals. Capture decoded response text/UTF-8 byte count/hash and exact row identities. Each full JSON payload must be <=250*1024 bytes. Validate route/result/filters shape, absence of document body/block/raw-content fields and off-route datasets. Bounded spec-filter options are legitimate filter data, not an off-route dataset. Save enough raw response evidence to audit bytes and structure; compressed Content-Length is not the gate. No need to repeat this deterministic check twenty times.
- One fixed stability sequence per route on unchanged fixture data: settled table with a known visible opener row; open its inspector through the real link; wait for accepted identity; close and restore focus; invoke the existing refresh and wait for completion with the same ordered IDs. Record toolbar, opener row, viewport/scrollport geometry and focused identity before/after each step. Toolbar remains visible and its vertical position unchanged within one CSS pixel rounding; the retained opener row remains within the usable table viewport. Close restores the expected opener; refresh preserves its identity/visibility. Intentional focus transfer into the inspector is not failure, nor is a separate filter's intentional row reset. No pixel-perfect horizontal layout gate is invented.

## Reporting, tests and failure behavior

Return a compact per-route metric ledger plus all raw sample rows, explicit budgets, fixture/source identities and cleanup errors. Keep NOT RUN, invalid, FAIL and PASS distinct. A missing metric cannot inherit another metric's pass. No hidden sample deletion, sweeps, automatic retry or tuning. A valid metric failure does not authorize a new series; the fixed remaining independent checks may still populate the final ledger as root's window permits.

Unit tests should cover nearest-rank/count/error handling, trusted clock/predicate rejection, distinct expected identities, filter total budget without subtracting observed delay, exact decoded payload bytes/body/off-route rejection, long-task overlap/max and mounted-row bounds, stability exceptions, and cleanup on error. Use deterministic fake adapters/records; no fixture-volume timing in unit tests. A tiny real compiled smoke validates browser API/selector assumptions but earns no acceptance credit.

## Coordination with H's other probes

Keep the original detail collector and its trusted-click to 100 accepted rows plus two frames endpoint unchanged. Add a separately versioned passive skeleton observation at the original click clock or perform one explicitly separate bounded visibility check; never silently edit the collector's accepted interval/hash. Skeleton must be visible within100 ms when the detail is still waiting. Loading150 on cold/list navigation stays at navigationStart, preserving initial blank time; browser chrome or later shell appearance cannot waive it.

Retention's existing per-target listener metadata should be supplemented at the same closed/quiescent GC snapshots by browser DOM counters, including jsEventListeners. Preserve the narrow counter scope and raw values; do not infer all listener cleanup from heap alone. The public CDP method is documented at https://chromedevtools.github.io/devtools-protocol/tot/Memory/#method-getDOMCounters.
