# TASK138 post-memo supported UI gate — FAIL

Exact committed `f8a7e1d1edbca416ece8ede8fc5d226d997e04e9` was archived without129orTimeline dirty work. One approved collector run used the supported Node25.6/Vite8.0.3 **DEV** pipeline on owned5310/PID43015. This matches the prior approved development launcher; a successful build was a separate gate, not production/previewHTTP. No launch/method/source/threshold tuning occurred.

|Trusted click→100accepted rows→2RAF, ms|Median|p95nearest-rank19/20|Maximum|≤300ms p95|
|---|---:|---:|---:|---|
|Task9999downstream|252.6|979.2|1131.4|FAIL|
|Spec10000linked tasks|284.9|504.3|812.4|FAIL|

Run2026-11-16 13:56:16–13:57:01UTC,44.68s, root-approved exclusive window. Each kind has5warmups+20retained measured samples; no invalid sample, removal, repeat or outlier rejection. All40measured clicks are trusted with100rows, exactly1matching ResourceTiming entry and0buffer-full events. Captured same-origin Page events:236requests, all200,0pending atcompletion. Browser closed and CPU/browser lease returned before reporting. Source175file hashes and immutable12202doc/3569698byte corpus proof match before/after.

HTTP is large in the observed tails: Taskp95sample979.2ms has937.7ms matchingHTTP (max1131.4/1082.6); Specp95sample504.3has463.4msHTTP (max812.4/772.3). These are durations, not a causal attribution. No separateTTFB/body timing, server spans or GC profiling was recorded. Residual click-minusHTTP includes dispatch/DOM/frames and is not pure renderingCPU. Do not infer a new failure mechanism or optimization from it without Astra's next diagnostic decision.

The unchanged approved collector preserves firstwarmup+20measured rowrecords, while remaining4warmup rowrecords are not serialized; their network requests remain. The request-map artifact derives serial kind/order mapping and retains this limitation. Page events may omit favicon/browser-generated requests, so0pending is a captured-Page bound. The collector's legacy contextCountProof string refers to prior functional instrumentation and does not independently count contexts in this exact run. No newinstrumentation/call-count claim is made.

Prior actual UI p95Task359/Spec326.1ms remains a separate historical FAIL with its original source/method record. COPY context227.26ms p95 and production coldCLI diagnostics are separate scopes and cannot replace this gate. The memo is committed as independently reviewed correct code, but138staysopen and300ms unchanged. This result does not certify129integration or131finalapplication protocols.

Raw values/network, offline request mapping and exact source/fixture/launcher/collector provenance are adjacent `task138-memo-browser-{profile,request-map,provenance,manifest}.json`. No measurement or tuning followed this failed run.
