# TASK138 — single post-memo COPY diagnostic

One frozen episode completed in 30.51s:3 warmups + 10 trusted Task rows and3 warmups + 10 trusted Spec rows, with actual Task preparations. All 26 rows and full ResourceTiming phases retained; no timeout, invalid row, buffer overflow, retry or new tuning. This instrumented trace is not a 300ms acceptance result. The uninstrumented gate remains a valid FAIL.

[Browser raw](task138-memo-trace-browser.json), [all server events](task138-memo-trace-server.jsonl), [request-ID correlation](task138-memo-trace-correlated.json), [frozen instrumentation and equality proof](task138-memo-trace-source.json).

Native Node/Vite boundary captured 266 HTTP completions,39 detail loads plus 1 list context,66 favicon requests with 0 context calls, no pending HTTP/context and peak 1 context. One actual memo factory stayed stable at 12,202 entries / 8,135,433 accounted bytes. After the initial list, all 39 contexts had 12,202 hits, 0 misses, bypasses, evictions or new parser identities, and always 12,202 fresh reads / 3,569,698 bytes with read peak 64 and final active 0.

The correlated tail is in context/TTFB rather than body download. Example request 239: 612.09ms context, 231.50ms logged GC overlap. Request 264: 744.74ms context, 17.72ms GC overlap, 805.03ms server response and 806.20ms browser request→responseStart; body 0.40ms. Memo lookup/clone/provenance also slow in that last context. These observations do not identify one sufficient cause. CPU/ELU/memory are process aggregates; overlapping callback/queue totals are not disk-only wall. No OS-pressure or thread/syscall sampling exists. Astra retains causal interpretation and next-decision authority.

Exact base f8a7e1d; new isolated source/launcher only at `/private/tmp/spm-task138-memo-trace-ncl2iis8`. Native Node 25.6 / Vite 8.0.3 DEV on port 5311 / PID 49793, no runtime/cache/pool variant or product API. Instrumentation/harness hashes match before/after. Full canonical context/revision/DTO and per-document provenance match baseline on first/warm loads; focused tests and webcheck pass; controlled reverse-completion ALS attribution passes. Previous gate 5310/source and shared product remain unchanged.

Browser closed and CPU/browser returned immediately; no further captures or measurements. All uncertainty and partial-phase definitions remain explicit in raw/correlation. TASK138 stays open and the 300ms threshold is unchanged.
