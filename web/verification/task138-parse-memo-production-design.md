# TASK138 — exact-byte parse memo production contract

Design proposal for independent Astra review, not authorization to ship code. The source candidate and confirmation are recorded separately. Context medians262.340292→169.202167ms and nearest-rank p95342.191541→227.261042ms are not the browser300ms gate. Preserve all20pairs including the one9.66% loss; no selection of only winning samples. Final TASK138/131 acceptance still requires the supported runtime and complete detail/browser protocol.

## Scope and ownership

UI Sol owns a small new `src/document-parse-memo.ts`, focused `tests/document-parse-memo.test.ts`, and the existing repository document-load helper hunk. Use an isolated checkout of the then-recorded functional baseline, with H129's action/editor/layout/DTO work excluded. Root integrates those repository imports/helper hunks serially and merges guidance. Do not touch answer-writing/locking, domain parsers, frontmatter parser, document-reader admission, provenance implementation, workspace/context/DTO resources or the129 editor. No dependency, public flag, CLI command, env control, watcher or background process.

The production integration is the same small read-helper seam exercised by the prototype: after each successful fresh Buffer read, ask the memo to parse/reuse a canonical document; then call existing registerDocumentSource on the returned fresh object using that NEW Buffer. All callers of this common helper retain their ordinary reads, including CLI and guarded answer operations. No cache entry is authoritative for a write:140 still rereads/checks exact target bytes and lease under its lock. Config/Git, directory enumeration, missing-current fallback and source sorting stay untouched. This common-helper integration avoids a second web-only repository path.

## Minimal internal API and lifecycle

`createDocumentParseMemo()` returns an internal synchronous `parse<T>(filePath, bytes, parser): T`. Keep one module-private instance in repository.ts per loaded process/module. Export only the factory/type needed by repository and unit tests from the local module, not src/index.ts or a documented package API. It owns its Map/LRU, WeakMap parser identities and accounting; no consumer can obtain retained values, buffers, cache entries, hit statistics, reset/invalidate controls or pending work. Remove experimental counters/clocks/profiling exports from production.

Factory tests may use smaller positive integer bounds via an internal optional limits argument, capped at the production defaults; repository always uses defaults. This is only deterministic capacity testing, not runtime configuration. Reject invalid internal bounds immediately. There is no global setter or public cache-control surface.

The cache exists only in process memory and dies with the process. It is not a cached ProjectContext, WorkspaceSource, snapshot, relation DTO, config or Git state. Across projects, keys distinguish actual document inputs; a project switch cannot reuse a different parser/path result merely because IDs or names match. Do not add per-project containers or asynchronous synchronization framework.

## Key, lookup and exact observation

Use unambiguous tuple encoding of: resolved absolute path, EXACT original filePath argument string, and parser FUNCTION IDENTITY. Preserve the original argument passed into the parser and returned document; do not canonicalize it to realpath or normalize Unicode/case. Resolved and original strings are both required because two aliases may read the same file while the canonical document's filePath differs.

Before any lookup, await the ordinary fresh read. A hit additionally requires Buffer.equals over ALL newly read bytes against the entry's retained byte copy. No hash-only, stat/mtime, TTL, presumed unchanged filesystem, preloaded previous buffer or watcher shortcut. Reads and directory failures propagate normally; an entry cannot satisfy a failed read. Missing paths are not returned merely because an old entry remains in bounded memory.

Different bytes remove the old same-key entry before normal parsing. Call the unchanged frontmatter and domain parser; parse errors propagate and are never cached. A later corrected file must be freshly read/parsed. Empty/malformed/unsupported data never gains a fallback success. Do not stabilize scoped-note wrapper function identities: those closures capture scope/writePolicy. Their existing per-call identities may miss; do not infer parser equivalence or reuse mutable parser configuration. All supported parsers are the existing pure deterministic repository parsers.

## Supported values and independent publication

Cache only an ordinary plain canonical record with own enumerable data fields: null/undefined/string/boolean/finite-number scalars or dense arrays of strings. Reject unsupported nested records/arrays, symbols, accessors, exotic prototypes, sparse/custom-property arrays or other nonstandard mutable values. Nonstandard descriptors may bypass as well; do not invent a generic recursive clone library. Determine eligibility and string-array field keys ONCE when considering an insertion, not on every hit.

Clone a supported value by copying its own scalar fields and slicing each recorded array. Own undefined fields and key order remain present; empty arrays and Unicode strings are exact. No JSON-round-trip, shared arrays, frozen shared return value, lazy proxies or structuredClone hot path. The retained parsed record is private, and both initial publication and every cache hit return a separate clone. A consumer can mutate a document or any tags/dependency/task-ID array without changing the entry or a later caller. Copy the input Buffer when retaining it so later mutation by a reader/caller cannot change the cache's proof bytes.

Unsupported/oversized entries simply use ordinary parsing without retention; publish that newly parsed value with its normal semantics. This does not mutate, freeze or silently simplify it. Supported oversized values may avoid extra clone work because there is no retained alias, but no speculative optimization beyond this obvious bypass is required. Do not retain unsuccessful or negative results.

Provenance remains outside the memo: registerDocumentSource associates only the fresh published document with the NEW successful read Buffer. Never inherit a previous WeakMap hash or register private retained objects as if freshly read. On a hit, it is truthful to say the newly observed bytes exactly equal bytes previously parsed by the same parser; do not claim parsing ran again. The existing hash algorithm and global snapshot revision computation remain unchanged.

## Fixed bounds, LRU and concurrency

Defaults: maximum16384entries and32MiB accounted bytes. Accounting is retained raw byte length plus UTF8 byte length of JSON.stringify of the supported canonical record, calculated on insertion only. It is a deterministic accounting cap, NOT an exact V8/Bun heap bound; report that distinction. No repeated serialization on hits. Entry/key/object overhead still exists and must not be mislabeled free or covered byte-for-byte by that number.

One current entry per tuple; remove accounting on replacement/eviction. A hit moves that entry to most-recent position. Before insertion, evict least-recent entries until BOTH caps hold. An individual entry exceeding32MiB bypasses without evicting useful entries merely to store something impossible. Evicted entries must require fresh read and normal parse when next requested. No expired-entry timers, all-project clear, hidden unbounded version history or cache metrics API.

Each parse/lookup/clone/LRU operation is synchronous and has no awaits. Concurrent loadProjectContext calls still own independent fresh reads/pools and source Buffers; JS completion order may determine which successful observation is most recently retained, but each published result derives only from its own bytes. There is no promise deduplication or sharing a pending context. A later completion with older bytes may replace a cache entry, but cannot alter already published results; the next call must compare its new read bytes again. Whole-project filesystem atomicity remains unchanged and is not claimed.

## Required implementation verification

Use focused behavioral tests, not tests that mirror private Map structure:

- Parser-call counting proves unchanged new bytes hit while every invocation still performs its fresh read; changed bytes parse, repeated invalid bytes throw again, real IO failure after a warm hit does not return stale data, and recovery rereads correctly.
- Exact original relative/absolute alias arguments and distinct parser function identities cannot cross-reuse canonical filePath or scope/writePolicy. Multi-project roots, changed scoped-note policy/config and includeScopedMemory=false preserve existing semantics.
- Returned scalar/array mutations, aliases across two returned documents, and mutation of the Buffer supplied to an earlier call cannot poison retained or later results. Own undefined fields, order, Unicode and empty arrays survive. Unsupported shape/descriptor cases bypass with ordinary parser behavior.
- With small internal bounds, test actual LRU victim order (touch A, add C, B is reparsed), not merely cap/eviction count. Cover count AND accounted-byte pressure, replacing a key without accounting leak, oversize bypass and an evicted-entry miss. Infer retention through parse behavior; do not add a production stats API.
- Deterministic concurrent reads of one path returning distinct controlled Buffers in reverse completion order produce separate correct documents/hashes; returned arrays never alias. One concurrent failure cannot poison the other's entry or publish a partial context. No sleeps as race barriers, pending-request sharing or filesystem snapshot assertion.
- Run existing repository/provenance/context/resume/guarded-answer compatibility tests against the integrated helper, plus small real temp fixtures for same-length restoredmtime edits, atomic replacement, addition/deletion, read error/recovery, scoped notes and missing-current no-provenance fallback. Result values, ordering, source revisions and Task/Spec bounded DTOs match the ordinary baseline under fixed clock inputs.

The pure memo unit can receive a counting parser; the repository integration must separately prove actual fresh reads/provenance. Retain the measured confirmation/oracles as evidence, not production instrumentation. Review code and tests independently before integration. Root serializes repository overlap with any H129 changes and commits the reviewed producer checkpoint before final combined measurements.

## Cold impact, documentation and final gates

The common-helper memo does extra eligibility/accounting/private-copy work on the first read. A one-shot CLI has no guaranteed benefit. Record matched baseline/candidate startup plus first-context observations for a representative actual-like temporary fixture using the shipped CLI runtime and fresh processes, including cold memo insertion cost; a few paired diagnostic samples suffice, not a new CLI acceptance budget. Report regressions honestly. No prefill, candidate-only warmup, forced GC or comparison to a different Node flag/runtime. Do not silently change CLI/read coverage to hide cold costs. Significant regression requires Astra review before integration; no arbitrary new numerical gate is invented here.

Production checks still use normal supported runtimes. The experiment's Node --experimental-transform-types flag is only its matched TS execution setup, not a required new launch flag for spm/ui. Final TASK131 application/browser-cold20samples must include the memo's genuinely empty process state, and the original list/detailed warm gates still apply. Context p95227ms alone does not establish click-to-reader<=300ms.

Update nearest src/services guidance and architecture to distinguish the authorized bounded exact-byte parse memo from forbidden cross-request context/DTO/source caches. Keep document-reader's fresh/no-byte-cache wording: it remains true. Explain that every request enumerates/reads all sources and receives new parsed-value clones/provenance, while pure parsing CPU may be reused only after byte equality. No blanket wording that all parsing reruns or that there is no process-level reuse. AGENTS/check and relevant test-diagnostics catalog remain required without bloating instructions; root owns shared docs merge.

Final freeze records source/runtime/fixture identity, functional/current-error/alias/concurrency coverage, bounds and cold observations. Independent design approval permits Sol implementation; independent code review and then exact final supported-runtime/browser measurements are still required. TASK138 remains in_progress and300ms unchanged throughout. H129 may proceed independently against the frozen functional transport/editor contract.
