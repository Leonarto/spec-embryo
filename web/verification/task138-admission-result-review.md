# TASK138 admission candidate — result and closure decision

Decision: REJECT the COPY candidate for production. Do not merge, tune or repeat it. The structural bound is correct, but the single agreed comparison does not show a clear useful performance gain.

Verified result manifest SHA256: `23d4541b3b8f909b3ecbfa742c016eaa5e83341866fac4ddf6cf0051bfbe28b4` in `/private/tmp/spm-task138-admission-96wl5p7t`. All referenced hashes match. The guarded run completed 50 loads in 11.784 seconds, with no timeout, no invalid result and exit code 0. All oracle signatures and the 200 frozen identities match before/after and current files. Five warmup pairs and twenty measured pairs follow the declared serial AB/BA order.

Independently recomputed:

| Context wall | Baseline | Candidate | Change |
|---|---:|---:|---:|
| Median | 150.738 ms | 152.495 ms | +1.757 ms / +1.17% |
| p95, nearest rank 19/20 | 236.423 ms | 214.606 ms | -21.817 ms / -9.23% |
| Maximum | 240.530 ms | 269.872 ms | +29.342 ms / +12.20% |

Only 8 of 20 matched pairs improve; 12 worsen. Median paired delta is +2.901 ms. Median process CPU is also slightly higher, 580.080 → 583.273 ms. The lower p95 alone does not outweigh the unchanged/slower typical behavior, majority of losses and higher maximum. This is not evidence to ship a latency fix, nor proof that bounded admission is universally slower. Preserve every sample and the successful correctness evidence without turning the allocation bound into a performance claim.

## One final-source detail acceptance is warranted

The historical valid FAIL, Task p95 979.2 ms / Spec 504.3 ms, belongs to f8a7e1d. The final combined application at 9a446a1 includes later reviewed UI integration and has never received its own complete detail 5+20 gate. Historical failure remains visible, but it does not substitute for required final-source acceptance. The direct-context baseline here also does not establish browser acceptance.

Authorize ONE final-source detail verification, after root freezes the exact committed application and validated harness/runtime identities and grants the exclusive window. Use the current supported `spm ui` launch path through the accepted harness, the unchanged official fixture and registered Node/browser setup. No runtime switch, prefill, cache tuning or candidate code is included. If harness-only files are committed separately, record their exact identities alongside the unchanged application snapshot.

Retain the original five warmups and twenty measured trusted opens per Task/Spec, 100 accepted relation rows plus two animation frames, complete raw results, correctness/revision checks, request records, source/fixture integrity and cleanup evidence. The threshold remains p95 <= 300 ms for BOTH kinds. Do not remove slow samples or reinterpret HTTP/context numbers as the click gate. Existing thresholds and treatment of invalid runs remain unchanged.

- A valid pass clears this final-source detail performance requirement only. It does not certify list warm/cold, retention, accessibility or the rest of TASK131.
- A valid failure stops this final-source series. Preserve it; do not restart until a favorable distribution appears. Further timing requires a separately reviewed material product/runtime change, not the rejected admission candidate.

The current contract does not require a runtime redesign before this one final-source verification. It requires testing the actual final supported product. This is a distinct acceptance obligation, not a retry of the earlier source or a claimed producer improvement.

## Concrete runtime decision if performance remains unmet

The current end-user launcher in `src/commands/ui.ts` invokes `run dev`, and `web/package.json` expands that to `svelte-kit sync && vite dev`. It therefore serves the application through development compilation. H's separate single Tasks smoke of approximately 12.07 seconds is not a 20-sample cold p95 and must not be relabeled one. The earlier trace also showed a large initial request interval outside context loading. These observations and the launcher code identify first-use compilation as a concrete product/runtime concern; they do not prove it causes every warm tail.

The next design decision should be whether normal installed `spm ui` serves version-matched precompiled client and SSR/server artifacts produced during build/release, while the dev compiler remains an explicit contributor workflow. This removes runtime compilation from the normal user's first route without prewarming or hiding work inside an acceptance harness. It is a change to the shipped product, not a benchmark-only use of preview.

Before implementation, that design must fix the supported server entry/runtime, artifact generation and version identity, npm packaging and global-prefix behavior, assets/routes, host/port/project-root handling, lifecycle cleanup and missing/stale-artifact behavior. Do not silently fall back to development mode or perform an unreported first-launch build. Preserve all fresh reads, memo semantics, guarded writes and DTO behavior. Review the concrete design and package contents independently; no implementation is authorized by this result review.

If adopted, validate the installed artifact through the same exact-source acceptance harness: lists warm <= 800 ms, application/browser cold <= 2.5 s with fresh server/browser and no hidden warmup, detail warm <= 300 ms, and the other unchanged TASK131 criteria. Report startup separately as specified. Precompilation removes a known class of first-use work, but no warm-tail or budget pass is promised before measurement. If the current final source passes detail but later cold fails, this same runtime design remains the relevant next decision for cold rather than another document-loader tweak.

Timeline DEV navigation p95 1341.7 ms and first warmup 10816.8 ms remain separate Timeline observations. They are not the Tasks/Specs list, detail or application-cold gates.

No product code, runtime configuration or additional measurement was changed during this review.
