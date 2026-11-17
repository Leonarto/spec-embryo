# TASK138 memo trace — independent review and bounded static audit

Decision: the trace establishes that the large delays occur inside fresh context loading, before response headers. It does not identify a single underlying cause sufficient to authorize another producer optimization. Keep TASK138 open and the 300 ms gate unchanged. Do not repeat this diagnostic, tune settings, or restart until a favorable result appears. The static audit identifies one demonstrable allocation opportunity, described below, but its effect on the unresolved tail remains a hypothesis.

## Evidence verified

- Diagnostic base: f8a7e1d1edbca416ece8ede8fc5d226d997e04e9. Instrumentation manifest SHA256: 8409e3166e551164d1588aa22aac67c3adb7671ec3388ffd11f37207f6455658. All eight instrumented source hashes, four harness hashes, and the patch hash match.
- Final durable manifest: `web/verification/task138-memo-trace-manifest.json`, SHA256 ffdf3aca44d4e4bf8d1e32d93f3cc1023f1690418b0d871e1436ed200cc785c0. All referenced artifacts match.
- One completed 30.51 second episode: three warmups and ten measured opens per kind, with all 26 rows retained. Spec preparation adds 13 Task requests. The 39 detail requests plus the initial list produce exactly 40 contexts.
- Independently correlated each browser row to the actual server response ID, then to its context, using Node's common monotonic clock for GC overlap. Independent derived rows are in `/private/tmp/spm-task138-memo-trace-independent-correlation.json`; they agree with UI's durable correlation.

## Findings supported by the trace

There are 266 completed server HTTP requests, including 66 favicon requests. Every favicon returns 204 with zero context calls. Each list/detail request loads exactly one context; other paths load none. Recomputed global peaks are six HTTP requests and one context, with none left active. Duplicate or concurrent context loads do not explain this episode.

There is exactly one memo factory. The diagnostic module itself is evaluated twice by native/SSR loading, but its copy-only shared instrumentation registry preserves attribution; that is not two product memo instances. The initial list populates the memo. Every subsequent context records 12,202 hits, zero misses/bypasses/evictions, and unchanged 12,202 entries / 8,135,433 accounted bytes. Parser identities remain four. Memo churn or a lost singleton does not explain these tails.

Every context freshly reads 12,202 documents / 3,569,698 bytes, with peak read admission 64, zero read errors, and zero reads active at completion. No collection omission or stale source shortcut accounts for the result.

The browser's wait for response headers closely follows server request wall time; body transfer is small: median 0.3 ms, maximum 8.1 ms over all diagnostic rows. Measured context medians are 209.34 ms Task and 203.30 ms Spec. Median server time outside context is about 26 ms for both. These are diagnostic figures, not acceptance statistics.

Two illustrative correlated tails:

| Request / context | Browser click → 2RAF | HTTP | Server request | Context | Recorded GC overlap |
|---|---:|---:|---:|---:|---:|
| 239 / 30, Spec sample 4 | 719.9 ms | 676.2 ms | 663.23 ms | 612.09 ms | 231.50 ms |
| 264 / 40, Spec sample 9 | 855.8 ms | 807.2 ms | 805.03 ms | 744.74 ms | 17.72 ms |

GC is a substantial observed contributor in the first example. The second cannot be explained solely by the recorded GC intervals. Its memo work totals 117.97 ms, including 80.00 ms lookup and 28.19 ms cloning; provenance takes 55.60 ms. Read queue maximum wait is 696.51 ms, callback maximum elapsed 50.47 ms, and context event-loop idle time 94.99 ms. These indicate broad slowing during context work; they do not isolate a faulty operation.

## Limits on causal claims

The trace contains no CPU stacks, per-thread CPU, syscalls, page faults, compression/swap or system-pressure counters. RSS and heap observations vary substantially, but they do not prove OS memory pressure or a leak. GC interval overlap is not exclusive causal accounting, and process CPU includes multiple threads. Queued and callback read sums overlap heavily; they are not disk wall time. Inclusive memo phases must not be added together.

Instrumentation adds per-document closures, timing calls, AsyncLocalStorage lookups, and synchronous writes for aggregate/request/GC events. Its overhead is real and prevents translating these values into the unchanged 300 ms gate. The earlier uninstrumented failure remains valid, but this trace cannot prove every tail in that earlier run had the same mechanism.

## Bounded static allocation and lifetime audit

Reviewed the exact baseline collection loader, reader queue, workspace-source construction and request-local source ownership.

A concrete structural opportunity exists at `src/repository.ts:152`: `Promise.all(files.map(loadMarkdownDocument))` eagerly creates one asynchronous document chain per listed file. Each immediately calls the shared reader, whose physical IO cap is 64 but whose queue accepts all jobs. Thus a 10,000-file collection can retain thousands of pending promises, resolver closures and queued job records while only 64 file reads are admitted. The reader clears admitted job references and eventually resets its queue, so this is workload-proportional transient bookkeeping, not evidence of an unbounded process leak.

A future isolated candidate could replace this eager document-chain admission with a fixed 64 active document operations per collection while preserving the existing shared FIFO-64 physical reader. That would demonstrably bound live per-document promise/job bookkeeping to the active collection windows. Sorted paths and the complete ordered result array still require O(N) storage; the unchanged reader's array backing storage can also remain O(N). Do not claim an O(64) total heap bound or fewer required file reads.

Minimal contract, if root elects to pursue this candidate later:

- Admit the next path when one active document operation settles; no batch barrier, parameter sweep, public setting, new cache, or reader concurrency change.
- Keep fresh enumeration, all successful-load reads, original path/parser identity, byte ownership, cloned values, provenance and sorted output positions unchanged across every existing collection and standalone caller.
- Preserve immediate rejection on the first observed failure and the existing drain behavior for the planned work, with handled errors and no partial context. Do not quietly introduce cancellation or delay error delivery until the collection finishes.
- Minimal deterministic tests use deferred reads to prove at most 64 active document operations, reverse completion with exact input-order output, every path attempted exactly once, shared physical admission still at most 64, and fail-fast rejection followed by clean drain without unhandled rejection. Reuse context/revision/DTO/freshness compatibility tests.

This is a demonstrable reduction in unnecessary outstanding bookkeeping, but the trace does not measure how much of the recorded GC or longest unexplained stall it causes. It is therefore not an approved performance fix or a promise to close the gate. No code candidate or timing run is authorized by this review.

Workspace analysis maps, fingerprint arrays and revision serialization are request-local, while the memo retains only its fixed successful-value set. `locals.workspaceSource` belongs to a request. No accidental global retention of whole contexts was found in this bounded audit. Post-context index/projection work is also too small in the recorded tails to justify a separate optimization now. Vite's own retained compilation state was not heap-profiled; do not blame or replace the supported runtime from these observations.

## Next decision

Stop performance mutations and measurements for now. Preserve the valid uninstrumented FAIL (Task p95 979.2 ms, Spec 504.3 ms), this diagnostic and its limits. Root can complete the independent UI/harness work without touching the producer. If root later chooses the bounded-admission candidate, first approve the explicit failure/drain contract and require proof of the structural bound; any timing experiment then needs a separate fixed protocol. No further diagnostic rerun or speculative cache/GC/IO tuning follows automatically.

No product source, browser state or additional measurements were changed during this review.
