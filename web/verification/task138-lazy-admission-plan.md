# TASK138 — one bounded-admission COPY candidate

Decision: proceed with ONE small isolated candidate, now that the functional UI baseline is committed at 9a446a1. This supersedes only the earlier pause on producer exploration. It does not authorize shared product edits or claim that allocation pressure explains every tail. The opportunity is concrete: the current eager files.map creates N pending document chains/jobs despite a physical read cap of 64; bounded admission can reduce live scheduling bookkeeping without skipping any source read.

Root owns coordination and any later integration. Sol UI may implement and test this COPY candidate. H remains on harness131. No execution window overlaps H's smoke, builds, tests or browser work.

## Exact implementation scope

Archive the exact full 9a446a1 commit into baseline and candidate copies with identical existing dependencies. Record the full SHA. Exclude uncommitted harness work. Keep baseline immutable.

Add one small internal helper, provisionally src/document-collection.ts, used only by repository.ts and its focused tests. Its operation accepts the already sorted path list and a callback returning a document promise. The cap is a private fixed 64, not configuration. Change only loadMarkdownCollection's eager Promise.all(files.map(...)) call to that helper. Do not modify loadMarkdownDocument, the existing FIFO-64 physical reader, memo, parsers, provenance, context/index/DTO code, runtime, dependencies or UI.

The helper must:

- Maintain at most min(64, N) active document operations per collection, replenishing on each settlement. No 64-item batch barrier and no per-file pending promise array.
- Assign each ordinal exactly once before awaiting work; preserve the original path string and return the original parsed object at that ordinal. Resolve the complete ordered array only after all operations succeed. Empty input resolves empty; no copy of document values or provenance transfer.
- Preserve immediate rejection with the EXACT first observed rejection/throw reason, including non-Error/falsy reasons. Use an explicit failure flag, not truthiness of the reason.
- After that public rejection, continue attempting the remaining planned paths under the same bound and handle every subsequent failure until all planned work settles. This preserves the eager loader's drain semantics instead of introducing cancellation or delaying rejection until drain. Workers must not leak unhandled rejections or recursively schedule synchronous completion.
- Preserve fresh directory enumeration, every planned document read, source ordering, standalone callers and both enabled scoped-note paths. Each context continues to own its existing shared physical reader; the total physical IO bound is still 64, not 64 per collection.

This bounds live per-document scheduling work, not total heap. Paths/results remain O(N), and the unchanged reader's array backing storage may retain consumed slots until it resets. No claim of an O(64) complete memory footprint, fewer total reads or fewer total callback invocations is permitted. No simultaneous queue compaction, lookup optimization, cache change or concurrency sweep.

## Deterministic gate before timing

Use controlled deferred callbacks, no sleep-based race tests and no timing thresholds:

1. With at least 193 inputs, exactly 64 start initially; resolving one starts one successor without waiting for a batch. Track live work and prove the bound throughout.
2. Complete work in reverse/mixed order; every path is called once and output values/object identities retain input order. Cover empty and fewer-than-64 inputs.
3. Reject an early operation while others remain pending. Observe the public rejection BEFORE drain; then release/fail remaining work and prove all N paths were attempted exactly once, outstanding work returns to zero, later errors are handled, and no partial success appears. Include synchronous throws and a falsy rejection reason.
4. Verify multiple collections still share the unchanged physical FIFO-64 reader. Do not confuse the per-collection document-operation bound with the physical IO bound.
5. Run affected repository/reader/memo/provenance/harness-context/guarded-answer compatibility checks. Reuse small real fixtures for same-length/restored-mtime and atomic edits, enumeration add/delete, read failure/recovery, aliases, scoped policy and returned mutation.
6. In a separate correctness process, prove full baseline/candidate equality on the immutable official 12,202-document / 3,569,698-byte fixture: canonical context, every actual source hash, fixed-clock revision and Task/Spec DTOs, on first and warm calls. Preserve this oracle for the timing runner.

Freeze the candidate core patch, tests, runner and both source identities. Independent static review of the small helper and failure/drain tests precedes timing. Root grants the quiet window only after this gate passes. No product integration follows from test success alone.

## The single fixed paired experiment

After the correctness/review gate, run exactly one fresh Node 25.6 process containing the frozen baseline and candidate modules, using identical --experimental-transform-types for both because the current TypeScript source requires it. This is the same symmetric direct-context execution method previously reviewed, not a change to supported product launch flags.

- Same immutable official fixture, naturally empty memo at process start. No context load before the declared warmups; preflight correctness ran in a different process. No forced GC, cache reset, prefill, runtime or environment tuning.
- Five warmup PAIRS, then twenty measured PAIRS. Alternate AB then BA across successive pairs. Every load completes before the other variant starts; baseline and candidate each receive 5 warmup + 20 measured context loads. No separate Task/Spec timing series is needed because this experiment measures their common full context producer.
- Measure complete loadProjectContext wall, process CPU/ELU and process memory. Natural GC observation may be retained without synchronous per-event file writes. Do not instrument every document with clocks, AsyncLocalStorage or logging. If verifying actual read totals during the run, the only allowed copy instrumentation is identical successful-read count/byte increments in both variants, outside the candidate algorithm; keep its patch separate from the proposed product patch.
- After each load and outside the timed interval, assert full context hash, corpus membership, source hashes, fixed-clock revision and both DTO hashes against the preflight oracle. All sources remain fresh; this is not an in-memory projection benchmark. Record the 12,202 / 3,569,698 read totals if the symmetric counters are used.
- Retain all 50 loads, order, warmup markers, raw values and source/runtime/fixture hashes before and after. Median is the average of sorted positions 10 and 11; p95 is explicitly nearest-rank position 19 of 20. Report paired wins/losses and paired deltas, full distributions, maxima and memory/GC limitations. Shared-process allocations and outside-timing validation can affect either side; do not assign process memory to one memo.
- A 45-second ceiling starts at the first declared warmup. On timeout/interference/error preserve partial evidence, classify the attempt inconclusive and stop; no automatic retry. No omitted outliers, second attempt, parameter sweep or additional general diagnostic.

Advancement requires independent review of a clear useful gain in paired context behavior, including the tail and memory tradeoff. A lower median alone with a worse tail, mixed/noisy tiny differences or a bookkeeping bound by itself is not enough to ship. Non-improvement or inconclusive evidence ends this candidate; do not tune or integrate it.

## Route to the remaining acceptance

A positive result permits proposing this small production change for independent code review. Only after that review, root-owned guidance updates, combined checks and a clean checkpoint commit may the exact supported Node/Vite combined product run the existing trusted-click 5-warmup/20-sample detail gate. That final gate retains 100 accepted rows plus 2RAF and p95 <= 300 ms. Direct-context improvement is not a substitute or a promise to pass it.

If the fixed experiment does not improve the producer materially, reject the candidate and preserve the current correct implementation. Do not restart the browser to seek a pass or reinterpret a failing p95. The remaining route then requires a separately reviewed product/runtime design addressing the full fresh-context cost, rather than further unmeasured micro-tuning; this decision authorizes no such redesign.

TASK138 and final acceptance131 remain open. Timeline's separate DEV navigation p95 1341.7 ms and first warmup 10816.8 ms are retained as Timeline observations; they are not list, detail, application-cold or new acceptance gates.
