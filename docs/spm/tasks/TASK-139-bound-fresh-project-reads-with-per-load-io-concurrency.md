+++
doc_kind = "task"
id = "TASK-139"
title = "Bound fresh project reads with per-load IO concurrency"
summary = "Reduce project-loading overhead through fresh Buffer reads and a shared concurrency-64 pool while preserving ordering, errors and same-read provenance."
status = "done"
spec_ids = ["SPEC-062"]
depends_on = ["TASK-128"]
blocked_by = []
priority = 1
owner_role = "implementation"
created_at = "2026-11-15T23:31:07.419Z"
completed_at = "2026-11-15T23:59:26.408Z"
tags = ["parallel-implementation", "performance"]
updated_at = "2026-11-15T23:59:26.408Z"
+++

# Execution and review

Implementation: Sol 6.1 High (`harness_implementation`). Technical decisions and independent review: Astra High. Begin after TASK-128 is reviewed and committed; commit this isolated producer change before TASK-138. No end-to-end detail performance gate is yet satisfied.

# Verification record

Implementation and serial integration APPROVED by independent Astra review. Exact 12-file snapshot reviewed; 9 product/evidence files and src/AGENTS retain identical bytes after application, while tests/AGENTS and architecture append only the approved guidance to preserve TASK-128. Isolated full suite: 347 tests, 7680 assertions; production LCOV scope 93.07% lines / 92.69% functions. Independent review: 36 tests / 825 assertions plus Node FIFO/error probes. Integrated repository/provenance/inspector/detail checks: 76 tests / 1180 assertions; web check 0 errors / 0 warnings; AGENTS passes. Final Node 5-warmup/20-sample context p95 improved 373.49 to 236.61 ms with equal context and source revision. This certifies the IO checkpoint, not the 300 ms hydrated-detail gate. Durable evidence: docs/project-read-performance-task139.md, its raw JSON and coverage JSON.

# TASK-138 — measured producer optimization decision

The Node25.6 context-loading p95 of379.5ms already exceeds the300ms warm-detail end-to-end gate before HTTP/client work. Small and fan-out HTTP endpoints both near500ms further indicate common load cost. Projection/index/serialization improvements alone cannot establish compliance. Bun's lower result is diagnostic only; keep the actual Node/Vite runtime and existing threshold.

## First authorized candidate, before any cache

Evaluate fresh byte IO with `node:fs.readFile` callback (wrapped as needed), replacing the large `node:fs/promises.readFile` fan-out, then cap concurrent file reads per load. Callback IO and bounded scheduling are implementation substitutions, not changes to source freshness. Read every current file each request and retain one Buffer→decode→parse→domain→provenance chain. Directory/config/current/Git reads remain fresh. Do not bypass scoped memory or alter repository output to shrink the fixture.

H may benchmark isolated copies only, preserving parsers and provenance: current baseline; callback/unbounded to isolate API overhead; callback/pool32 and pool64. Prefer shared per-load scheduling across collections, preserve each sorted file list's result positions independent of completion order. Compare Node on the same fixture/machine without overlapping browser/performance work; exploratory3warm+10serial is sufficient to select candidates, but the chosen candidate requires5warm+20serial. Record raw samples plus context/index/projection/stringify and actual runtime. Astra selects the production concurrency after this comparison;32/64 is not a user-facing tuning option. No product edit authorized merely by this exploratory request.

## Invariants and required regression gate

- Each load lists directories anew and reads bytes anew; same-size edits with restoredmtime, atomic replacement, new/deleted/renamed files and symlink behavior must remain as supported by the existing loader. No atomic filesystem snapshot is newly promised.
- Preserve source ordering, current defaults, parse exceptions and legacy collection semantics. A failed read/parse must fail the load, not drop a document or return a cached previous result. Pending read completion must not publish a partial context.
- Keep original Buffer provenance bound to the document produced from those exact bytes; no read-to-parse then independent reread-to-hash.
- Preserve request-local source sharing for layout/page. Do not introduce process-global request caches, TTL, stat/mtime shortcuts, watcher validity assumptions or a hash-only permission to skip fresh bytes.
- Do not change process-wide UV_THREADPOOL_SIZE, runtime toBun, or replace async reads with main-thread synchronous bulk IO to win this benchmark.
- Tests cover concurrency/order, errors/resource cleanup, adversarial same-size/restoredmtime edits and provenance. Run affected repository/harness source-snapshot tests as well as workspace/detail tests, because this is shared IO.

## Integration boundary

If callback/bounded fresh IO shows a material repeatable win, prefer a separate small producer checkpoint committed and independently reviewed before138's final measurement. It touches repository/storage behavior shared with harnesses and should not be buried in the detail DTO diff. It can be implemented while UI130 owns Timeline; neither side edits the other's files. Root owns task/dependency bookkeeping. If the gain is insufficient, return measured remaining spans for the next Astra decision; no speculative parser cache or freshness relaxation is preauthorized.

After the producer checkpoint plus138 bounded DTO/readers, rerun actual Node/Vite HTTP and hydrated detail measurement on the official large fixture. A loader microbenchmark is not a passing300ms result. Any remaining failure stays open and visible before131, without changing thresholds or reporting in-memory timings as end-to-end results.

## Exploratory result and finalist

Inspected raw summaries for3 warmups+10 serial Node25.6 samples on the same12,001-document fixture:

| Variant | Median context ms | p95 context ms |
|---|---:|---:|
| fs/promises baseline |319.82|349.10|
| callback unbounded |264.67|300.41|
| callback pool32 |239.35|340.82|
| callback pool64 |218.93|237.84|

All variants report the same source revision. Select **callback IO with shared per-load concurrency64** as the sole finalist: best median and tail in the exploratory data. Do not broaden the parameter search. Confirm with5 warmups+20 serial samples each for baseline and pool64 in a new CPU window coordinated by root, same Node/runtime/fixture and no simultaneous UI benchmark. Preserve raw distributions and equality of resulting revision/document count. A repeatable improvement justifies the small producer implementation/review checkpoint; no product mutation is approved by the exploratory measurements alone.

The prototype fixture has no scoped notes. Production candidate must pass the same per-load reader to enabled session/org collections as well as current/specs/tasks/handoffs, so the stated64 limit is genuine across that context load. Add an enabled-scopes fixture and maximum-in-flight assertion; preserve scope/write-policy parsing and independent request ownership. Do not skip collections to retain the benchmark result. Full-file Buffer freshness/provenance and failure semantics remain mandatory. The64 bound is per context load, not an undocumented process-global semaphore or runtime setting.

These figures are loader microbenchmarks. They do not include the remaining index, projection, HTTP or hydrated-reader costs and do not satisfy or relax the300ms gate.

## Confirmed candidate — TASK-139 authorized

Read confirmation JSONs: Node25.6,5 warmups+20 serial samples, baseline context median336.37ms/p95384.60ms versus callback pool64 median202.15ms/p95238.76ms, identical source revision. This repeatable improvement authorizes the small production IO checkpoint139, not a300ms UI claim.

Execution order:139 depends on committed128 as an operational clean-diff gate; no semantic dependency on inspector exists.138 depends on139+128 and begins only after139 review fixes are committed. UI130 may run concurrently with H139 after128 under separate ownership.129 remains after138;131 waits all required checkpoints. No producer changes during128 review.

139 product scope: private/document-IO helper plus repository plumbing, focused tests and maintenance docs. A small `src/document-reader.ts` helper is appropriate if keeping the callback/pool implementation separate aids tests; do not expose a new CLI/config or package API, change domain/frontmatter parsers, edit web/TIimeline, or add instrumentation globals to production. H owns these IO files; root owns managed memory/commits. Apply callback Buffer reads consistently to repository document reads; share exactly one concurrency64 reader across every collection within each loadProjectContext (including enabled session/org and current state), with ordinary private default readers for standalone collection operations. Do not reuse the per-load queue across requests.

Pool contract: at most64 file reads in flight for that context load; FIFO queued admission; release a slot after success OR read error, including synchronous read setup failure. No busy polling, recursive synchronous scheduling or global process knob. Queue closures may be released as admitted; no retained queue after load completion. The original sorted file positions determine Promise.all result order, never IO completion order. Parsing occurs from the returned Buffer as before; provenance is registered from that exact Buffer. Failed read/parse rejects the public load with the underlying error; no partial success, fallback document, swallowed error or unhandled rejection. Already-started IO may settle after fail-fast rejection (as with the previous Promise.all contract); it must close normally and not wedge the queue or mutate an already published context. No new cancellation protocol is required.

Required139 evidence:
- Controlled fake callback reader proves cap64 across collection scheduling, FIFO admission, out-of-order completions preserving output order, error/synchronous-throw slot release, queue completion without unhandled rejections, and independence of simultaneous per-load pools. Use dependency injection in the private helper, not a new public repository flag.
- Real temporary fixture with tasks/specs/handoffs/current AND enabled session/org notes verifies membership, source order, note policy/scope, and all document hashes against freshly read original bytes. Verify includeScopedMemory=false still excludes only those scopes as before.
- Successive fresh loads detect same-length contents with restoredmtime, atomic same-path replacement, added/deleted/renamed document and parse failure; fresh directory enumeration and config/Git behavior unchanged. Stable symlink/directory inclusion follows the existing listMarkdownFiles contract; no new symlink-following policy or atomic-snapshot promise.
- Preserve full existing repository/source-provenance/resume/hook-context guard tests; run appropriate full Bun coverage/checks at the checkpoint because this common IO path feeds both harness and UI. Keep≥80% overall, maintenance AGENTS current, and show test scope honestly.
- Benchmark the final production implementation (with scoped-note plumbing, no instrumentation timing overhead in its result) under Node against the baseline using the same procedure/fixture. Report raw5warm+20serial results and exact equality of context values/revision, with nondeterministic clock labels excluded consistently. Separately include correctness tests with notes; do not claim the zero-note timing fixture exercised note IO.

Approval gate is independent review of the frozen139 manifest, semantics/tests/provenance and measured IO improvement, then commit.138's bounded producers/readers and final real Node/Vite hydrated-detail p95 remain necessary. If end-to-end300ms still fails, it stays open for measured diagnosis;139 does not authorize caches or relax the threshold.


# Independent design review

# TASK-139 independent design review

**Status: APPROVED.** No unresolved design findings.

Reviewed the complete `/private/tmp/spm-task138-performance-decision.md`, especially lines 43–60, against `src/repository.ts`, `src/storage.ts`, and `src/services/document-provenance.ts`. Consulted TASK-139 through the CLI. This is design approval only; no production edits, browser work, benchmarks or test runs were performed.

## Contract assessment

- One private concurrency-64 reader per `loadProjectContext`, threaded through current state and every enabled collection, prevents six independent pools from multiplying the advertised limit. The plan explicitly covers session/org scopes and simultaneous-load independence. Config reading precedes collection fanout in the existing loader; existing config/Git behavior remains unchanged.
- FIFO admission and Promise.all result positions preserve source ordering despite completion order. Existing post-load ordering remains authoritative: scoped notes sort by ID and handoffs by descending createdAt; stable ties retain the original file order. Domain parsers and omission behavior remain unchanged.
- Slot release covers success, callback error and synchronous setup throw. Failed reads/parses reject with the underlying error, with no partial context or fallback. Draining outstanding work must release closures/slots and avoid unhandled rejections; the plan requires that regression gate and does not introduce cancellation semantics.
- The returned Buffer remains the sole input for UTF-8 decoding, parsing and identity-scoped provenance registration. No second read, clone hash transfer, stat shortcut or cached document is authorized. Synthetic missing-current-state behavior retains its existing lack of source provenance.
- Every successive load enumerates directories and reads current bytes. Same-length/restored-mtime edits, replacement, additions/deletions/renames, parse failures and existing symlink inclusion are explicit tests. Keep caller-supplied config and includeScopedMemory=false semantics exactly as today.

## Adequacy of verification and ownership

The controlled callback tests plus the real enabled-scopes fixture are complementary: the former proves global-per-load admission, order and failure cleanup; the latter proves repository plumbing, membership, policy and exact-byte provenance. Ensure the max-in-flight assertion actually schedules all collections through the same reader, rather than testing six isolated helper instances. Existing harness/source-snapshot/guard/workspace tests and full coverage are appropriate for this shared IO path.

The proposed final Node benchmark compares production code with baseline using raw 5-warmup/20-serial samples and equality of complete contexts/revisions. The recorded 384.60→238.76 ms context p95 supports selecting this candidate; those supplied prototype figures were not independently reproduced in this design review and do not establish the 300 ms end-to-end UI gate. The zero-note timing fixture is correctly distinguished from enabled-note correctness evidence.

Scope and sequencing are coherent: 128 commit → 139 implementation/review/commit → 138; Timeline-only 130 may proceed in parallel with 139. No cache, parser/domain change, web change, runtime switch, global semaphore or UV_THREADPOOL_SIZE change is authorized. Ready for implementation under the stated frozen-manifest review gate.


## Isolated139 preparation while128 closes

Approved orchestration refinement: H may implement and independently review139 in an isolated exact `896ce55` checkout/archive with linked dependencies, excluding every dirty128 file. This changes only the operational start gate, not integration order or dependencies. H owns temporary139 source/tests/evidence; main workspace freeze remains untouched. Record baseline commit, exact product/test manifest and validation scope; do not claim integrated128 coverage from this older snapshot.

Order: (1) isolated139 implementation/tests/review; (2)128 fixes reviewed and committed; (3) verify139 patch applies cleanly with only approved IO/tests/guidance changes and no copied generated artifacts; (4) apply serially to shared repo; (5) run affected repository/provenance tests plus newly integrated128 inspector/detail tests, web check, AGENTS and diff checks; review any conflict or changed implementation before commit; (6) commit139, then begin138. No task139 done/commit-integrated claim before this sequence. If final product bytes match the reviewed measured snapshot exactly, copying alone does not require rerunning the same microbenchmark; combined end-to-end performance remains138/131. Root reconciles managed docs rather than copying stale status from the isolated checkout.


# Independent implementation and integration review

# TASK-139 independent implementation review

**Status: APPROVED — frozen implementation and integrated 12-file checkpoint. No findings.**

Reviewed `/private/tmp/spm-task139-implementation` against exact base `896ce55779f8250af89821e7dd8de95ca0cffa8f`, using `/private/tmp/spm-task139-final-manifest.json` and `.sha256`. All 12 file hashes passed before final evidence inspection and again afterward. Authenticated all 148 tracked baseline src/web source files directly against Git objects; production tracked source differences are only repository plumbing and its guide, plus the new reader. No shared mutable TASK-130 source was reviewed or certified.

## Semantics and failure review

- `src/document-reader.ts:16` owns a fresh FIFO per factory invocation, caps active reads at 64 and releases admission on success, read error or synchronous setup throw. The draining flag keeps synchronous completions iterative; the settled guard prevents duplicate release. Admitted queue slots release job references and the exhausted array is cleared. There is no cache or global pool.
- `src/repository.ts:400` constructs exactly one reader and passes it to current state, specs, tasks, handoffs and enabled session/org notes. Standalone collection operations obtain their own readers. Config, Git and directory enumeration are unchanged. Caller-supplied config and includeScopedMemory=false retain their contracts.
- Parsing still consumes the returned Buffer once, then registers provenance against those same bytes and the exact parsed object. Result positions remain Promise.all/file-order based, with existing note-ID and handoff-date stable sorts. Missing-current synthetic provenance and symlink omission behavior remain unchanged.
- Read/parse failures reject the public load without publishing partial context. Queued/active work can drain after rejection without a new cancellation promise; errors remain handled and later loads use independent queues.

## Independent verification

- Snapshot-only focused run: **36 pass, 0 fail, 825 assertions** across document-reader, project-read-freshness, harness-context, resume-window, workspace and details suites.
- Separate Node v25.6.0 probe `/private/tmp/spm-task139-independent.mjs`: **4,097 jobs**, deliberately varied completion order, two read failures including one after fail-fast rejection, exact FIFO admission, peak 64, zero unhandled rejections and successful queue reuse. No benchmark rerun.
- Existing integration test instruments the factory through test-only injection and observes one pool, all 501 documents across all six groups, max 64, correct scopes/policies/order and exact source hashes. Freshness tests cover restored-mtime same-length edits, atomic replacement, rename/delete, parsing/read failure recovery, raw invalid UTF-8, configuration and synthetic current defaults.
- Inspected recorded full suite: **347 pass, 0 fail, 7,680 assertions**; web check 0 errors/0 warnings; AGENTS check passes. Independently recomputed LCOV counts: instrumented product src/web 89 files, 92.69% functions / 93.07% lines; all instrumented files 92.59% / 91.91%. This preserves the report's distinction from Bun's displayed aggregate and does not imply every uninstrumented product file was measured.

## Measurement and documentation

Verified final raw benchmark source hashes against the frozen code, the baseline repository hash against Git, all 20 samples per variant, medians/nearest-rank p95 calculations and equal context hashes/revisions/counts/serialized sizes. The runner checks equality for warmups too. Node context p95 improves **373.49 → 236.61 ms**, median **312.57 → 200.66 ms**. The matching fixture recipe and baseline/production module graphs are documented. No instrumentation is in production.

The report correctly limits this to fresh context/index/projection/stringification on a warm, zero-note synthetic fixture. Baseline-first ordering, same-process GC and absent HTTP/hydrated-render measurement are disclosed. Enabled-note correctness is separately tested. This does **not** pass or relax the 300 ms end-to-end detail gate.

The three guide deltas accurately describe the change; root must reconcile them with current shared docs instead of replacing files from the older isolated base. Approval covers the frozen implementation/evidence and intended guide deltas. Integration with committed TASK-128 and concurrent TASK-130 remains the coordinator's separate gate, followed by the normal reviewed commit before TASK-138.

No product, managed-document or shared-repository edits were made during review; no browser used.

## Integrated checkpoint recheck

Verified `/private/tmp/spm-task139-integrated-manifest.json` against the live frozen 139 files after integration onto TASK-128 commit `051940b`. All 12 integrated hashes match; the 9 implementation/evidence files plus src/AGENTS.md are byte-identical to the approved snapshot. tests/AGENTS.md and docs/architecture.md preserve their complete committed 128 contents and add only the approved reader guidance. No earlier inspector guidance was removed.

Reviewed coordinator integration logs: **76 pass, 0 fail, 1,180 assertions across 9 files**, including repository/freshness/hook/guard/resume and 128 inspector/detail coverage; web check **0 errors, 0 warnings**. Coordinator reports AGENTS check passing (tests guide 348/350). No benchmark repetition was needed for unchanged production bytes.

The integrated 139 checkpoint is approved for the planned exact-file commit. This does not certify concurrent mutable TASK-130 sources or satisfy the pending end-to-end UI latency gate. No findings.
