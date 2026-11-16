# TASK138 flat exact-byte parse reuse — promising COPY-ONLY experiment

The final Astra-approved COPY-ONLY delta is promising: all5matched measured pairs loaded context faster, with a39.6%median wall reduction. This authorizes no production cache,20sample confirmation, browser acceptance or300ms claim. Root/Astra must choose the next gate after independent review.

The original structuredClone prototype remains unchanged and rejected in `task138-parse-reuse-*`. Its24checks covered absolute roots only. Astra additionally required the original input path argument in the new key alongside resolved path and parser function identity: canonical parsers retain `filePath`, so relative/absolute aliases must not reuse a differently spelled canonical path. This correction is included in lookup wall cost and tested against full baseline context and fresh provenance for both root spellings.

Only clone eligibility/operation and that correctness partition changed. Eligible canonical documents must be plain objects with own enumerable data properties holding primitives or dense plain arrays containing only strings. Eligibility/array keys are validated on insertion. Copies spread own properties and slice each recorded string array; own undefined values, property order, Unicode and empty arrays are preserved. Nested/exotic/accessor/symbol/nonplain/sparse/mixed-array values bypass the memo and follow normal fresh parsing. No mutable array is shared with callers. No JSON serialization occurs on hits.

The exact fresh-read policy, successful-value-only retention, full new Buffer equality, parser identity, LRU,16384entry/32MiB raw+UTF8serialized accounting, oversized bypass, normal provenance registration, configuration/Git and all enabled collections remain as before. Every eligible canonical publication, including misses, is independently cloned. Scope-note wrapper identities may miss; no equivalence is inferred. Both archives start from exactf8c51db; shared product files were untouched.

Correctness passed28named cases, including full12202document context/actual source hashes/fixed-clock revision and Task+SpecDTO equality on cold/warm loads, disposable freshness mutations and scoped notes, mutability, strict bypass, aliases and bounded retention. The official fixture was immutable and every measured load freshly read12202documents/3569698bytes.

The approved microclone measured the same12202canonical documents after validating insertion eligibility and precomputing array keys.3warm+5serial matched AB/BA pairs: structuredClone median37.842ms (36.048–42.101), flat clone2.095ms (1.847–2.803). This is clone-only with no IO/lookup/provenance; the following full context test includes those costs.

One context experiment ran2026-11-16 13:05:44–13:05:48UTC:3warm+5measured serial matched AB/BA pairs pervariant. Both used Node25.6.0 with identical Astra-approved `--experimental-transform-types`; the experimental warning is retained in isolated logs. Historical plain-Node138 at140f902 is a different setup and is not a direct baseline. Candidate started empty and filled naturally on its first warmup.

|Measured span|Baseline median (min–max), ms|Flat candidate median (min–max), ms|
|---|---:|---:|
|Context wall|263.93 (252.95–276.28)|159.47 (152.38–197.74)|
|Process CPU aggregate|785.57 (766.78–819.71)|616.54 (614.11–675.56)|
|Parse|67.03 (66.30–71.88)|0|
|Clone|0|3.49 (3.41–4.09)|
|Lookup, exact-byte compare and LRU|0|19.64 (18.88–22.16)|
|Eligibility/accounting|0|0 (warm hits)|

All16loads matched the exact full context, revision and fixed-clock Task/SpecDTO hashes. Every measured candidate load had12202exact-byte hits and retained12202entries/8135433accountedbytes. Full context wall includes clone/comparison/accounting/eviction/provenance and fresh IO; accounting is deterministic retained raw+serialized canonical bytes, not JS heap. Process memory includes both variants and GC is not forced. Do not attribute the entire wall delta solely to the listed CPU phase differences.

Frozen source, executable patches/scripts, raw correctness/microclone/context samples and hashes are in adjacent `task138-flat-parse-reuse-{source,correctness,microclone,experiment,manifest}.json`. Isolated source/logs remain `/private/tmp/spm-task138-parse-reuse-zhfk0a5p`. No browser was used; no shared product implementation was changed. Production design and exact supported Vite/browser end-to-end acceptance remain pending.
