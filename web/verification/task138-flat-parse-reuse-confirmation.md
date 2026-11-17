# TASK138 flat parse reuse — matched confirmation

The single authorized COPY-ONLY confirmation remains promising: context median fell35.50%, and19of20matched measured pairs improved. This is not production approval or the300ms browser gate. No shared product source was edited; the prior browser result remains Task359ms/Spec326.1ms FAIL until the exact reviewed supported product passes it.

Protocol: one fresh Node25.6.0 process, identical `--experimental-transform-types` for both frozen f8c51db trees;5warmup pairs then20measured serial AB/BA pairs, alternating order across blocks. Same immutable12202document/3569698byte official fixture. Run2026-11-16 13:13:58–13:14:12UTC (14.36s), during the root-approved quiet window. No forced GC, extra prefill, retries, repeats, tuning or discarded samples. Median is the mean of sorted positions10and11; direct-context p95 below uses nearest-rank position19/20. Raw order, all50loads and every measured sample are preserved.

|Span, ms|Baseline median (min–max)|Candidate median (min–max)|
|---|---:|---:|
|Context wall|262.340 (231.080–382.156)|169.202 (156.645–272.962)|
|Process CPU aggregate|831.553 (748.211–1077.012)|641.994 (615.085–907.932)|
|Parse|65.676|0.000|
|Clone|0|3.834|
|Lookup/key/byte comparison/LRU|0|20.533|
|Eligibility/accounting on warm hits|0|0|

Direct-context nearest-rank p95: baseline342.192ms, candidate227.261ms. This is loader/context wall, with no HTTP, trusted click, rendering or2RAF; it cannot certify a browser latency gate.

Matched reductions range from-9.66%to51.12%. Pair19regressed9.66% (248.925→272.962ms) and remains in all summaries. There was no attempt to remove or repeat it. The warm distributions have visible tails; do not attribute the full wall change solely to subtraction of phase medians. Shared-process allocation, outside-timing equality work and natural GC can influence both sides; raw CPU/ELU/GC/memory fields remain available.

Candidate initial cache/read counters are all0. First candidate warmup:12202misses,0hits; subsequent4warmups and20measured candidate loads:12202hits/0misses each. All50loads freshly read12202documents/3569698bytes and matched exact full canonical context, source revision and fixed-clock Task/SpecDTO hashes. Retention stayed12202entries/8135433accountedbytes, below16384entries/32MiB. Accounting is retained raw+UTF8serialized canonical bytes, not total JS heap. Four source hashes were asserted against the reviewed exploratory snapshot before and after the run.

The candidate implementation, path/parser partitions, eligibility, fresh IO and provenance policy are unchanged from the independently reviewed exploratory source. Only a distinct runner's5/20bounds,20sample summary arithmetic, explicit initial stats and before/after hash assertions were added. The earlier28correctness checks and independent review still scope correctness; this confirmation does not add an LRU-victim or IO-error recovery production regression. Those remain explicit production-design gates.

No new product variant or20sample browser test is authorized by this report. Next step requires root/Astra's concrete production contract and independent review. Final acceptance must use the exact supported combined spm/Vite product, including129integration, and retain the unchanged300ms browser threshold. Historical pre140 plain-Node138 numbers are not direct gain baselines for this flag/source experiment.

See adjacent confirmation raw JSON, runner/source bundle and manifest. The frozen exploratory six artifacts remain unchanged. Isolated source/output: `/private/tmp/spm-task138-parse-reuse-zhfk0a5p`. CPU released immediately after completion; no browser was used.
