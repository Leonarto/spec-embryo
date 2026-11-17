# TASK138 final-source detail — independent result review

Decision: valid FAIL on final combined application 9a446a1e794b21b60283ad58ff11ce3dc0d853c0. Preserve this result and stop this series. No retries, producer tuning or acceptance waiver. Runtime design review is the next authorized planning step; implementation remains unapproved until that concrete design is independently accepted.

Verified manifest `web/verification/task138-final-detail-manifest.json`, SHA256 `fd18ace3a0808660627ffafac19e45beabd438921c07675d154220f629e80b11`, and all eight referenced artifact hashes. Independently compared all 204 application files against their hashes and actual Git blob identities for 9a446a1. Source before/after identity matches; the rejected admission candidate is absent. The exact collector is unchanged at SHA256 `3f295995b016a4582861f045025849abb030c0467884d6674aa7b90f213b04e6`.

Recorded Node 25.6 / Vite 8.0.3 DEV on owned port 5314 is the accepted supported-dev-equivalent launcher, not a production preview. Fixture proof preserves 12,202 documents / 3,569,698 bytes and membership/content identity. Browser/server termination is recorded. No source, runtime, fixture or threshold substitution is evident.

Independently recomputed the 20 measured samples per kind:

| Trusted click → 100 accepted rows + 2RAF | Median | p95, nearest rank 19/20 | Maximum | Gate |
|---|---:|---:|---:|---|
| Task | 233.3 ms | 398.0 ms | 416.8 ms | FAIL 300 ms |
| Spec | 253.2 ms | 523.5 ms | 574.1 ms | FAIL 300 ms |

Every measured row has a trusted click, 100 rows, one matching resource entry and no timing-buffer overflow. No invalid result or omitted measured sample. Five warmup iterations per kind occurred; the unchanged collector serializes only the first warmup row while retaining all warmup request events. All 248 captured Page requests return 200, with zero captured requests pending.

The passive ResourceTiming snapshot from this same completed session matches all 40 measured rows individually:

- Task p95 row: click 398.0 ms, HTTP 379.9 ms, request-to-response-start 379.2 ms, body transfer 0.3 ms.
- Spec p95 row: click 523.5 ms, HTTP 475.9 ms, request-to-response-start 474.2 ms, body transfer 0.5 ms.
- Median click-minus-HTTP residual is 21.95 ms Task / 28.75 ms Spec. Maximum body transfer among measured rows is 0.4 ms / 0.5 ms respectively.

Thus waiting for response headers dominates these observed tails; body download is negligible. The residual is not pure rendering CPU. This uninstrumented gate has no new server spans/GC proof, and Page events cannot prove global context exclusivity. Do not transfer the earlier COPY trace's exact causal accounting to this run.

Historical f8a7e1d FAIL remains a distinct result. This required final-source check did not validate a producer improvement and does not supersede the rejection of bounded admission. TASK138 and acceptance131 remain open. All thresholds remain unchanged, including list warm 800 ms and application/browser cold 2.5 s. Timeline and single setup smoke timings retain their original separate meanings.

No further measurement or code changes were performed in this review. Await the concrete precompiled-runtime design and review it independently before Sol implementation.
