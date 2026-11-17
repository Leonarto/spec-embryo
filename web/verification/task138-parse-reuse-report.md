# TASK138 exact-byte parse reuse — rejected experiment

The single approved COPY-ONLY candidate did not improve context loading. Stop here: no production cache, tuning variants, Node/browser20 confirmation or300ms acceptance claim.

Both archives start from `f8c51db82814d9599b8edca9ab417ec440b7da10`. Shared product files were not edited. Baseline and candidate have identical fresh-read/parse instrumentation; candidate alone replaces fresh parsing with private successful canonical-value reuse after a complete new Buffer proves exact equality for the resolved path and parser function identity. Every canonical publication is independently cloned and receives normal provenance from the new source Buffer. Fresh enumeration, FIFO64 IO, configuration, Git and all enabled collections remain active.

Correctness passed24 named cases: full12202document context, actual source hashes, fixed-clock revision and Task/Spec DTO equality on cold/warm candidate loads; independent consumer mutation; disposable same-length/restoredmtime edit, atomic replacement, addition/deletion, parse failure/recovery, reappearance, session/org notes, disabled notes, configuration and Git freshness; parser/path identity, replacement and no-negative-cache behavior;16384entry and32MiB deterministic raw+UTF8serialized-value caps, oversized and unsupported bypasses. The official fixture remained read-only; all mutations used a disposable initialized fixture. Scoped-note wrapper identities may miss; they are never inferred equivalent.

One matched serial experiment ran2026-11-16 12:59:33–12:59:39UTC:3warmups+5measured pairs, alternating AB/BA order. Both used Node25.6.0 with the same Astra-approved `--experimental-transform-types` flag because committed140 syntax is unsupported by strip-only Node. Its experimental warning is retained in the isolated logs. This differs from historical plain-Node138 at140f902; those historical numbers are not a directly comparable baseline. The eventual supported spm/Vite runtime remains unchanged.

|Measured load span|Baseline median (min–max), ms|Candidate median (min–max), ms|
|---|---:|---:|
|Context wall|258.36 (238.11–289.16)|292.31 (257.02–321.64)|
|Process CPU aggregate|790.68 (747.33–931.09)|839.52 (770.09–924.23)|
|Parse|66.58 (64.38–67.84)|0|
|Clone|0|57.19 (55.05–58.62)|
|Lookup, exact-byte compare and LRU|0|21.33 (20.37–21.91)|
|Canonical validation/accounting|0|0 (warm hits)|

Candidate median wall time regressed13.1%, and4of5 matched measured pairs were slower. Clone+lookup alone cost more than the avoided parsing span; this does not attribute the entire wall delta to one cause. All16loads freshly read12202documents/3569698bytes and matched full context, revision and fixed-clock Task/Spec DTO hashes. Candidate started empty, populated during its first warmup and retained12202entries accounting for8135433bytes. Every measured candidate load had12202exact-byte hits. Clone, comparison, accounting, eviction and provenance are inside context wall. Accounting is a deterministic cap, not a JS heap measurement; process memory includes both variants and GC is not forced.

Raw samples, measured phase counters, source hashes and executable source/patches are retained in the adjacent `task138-parse-reuse-{correctness,experiment,source,manifest}.json`. Isolated source/logs remain at `/private/tmp/spm-task138-parse-reuse-zhfk0a5p`. No browser was used. No further measurement or product change is authorized by this result.
