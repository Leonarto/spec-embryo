# AGENTS

- `acceptance-*` prepares final131 checks: shipped `spm ui`, owned process leases/dependency seed, fresh cold profiles/caches, identical static-closure gzip. Smoke has no acceptance credit; timing windows are serialized.
- Launcher identity permits only exact env→Bun argv with stable PID/PGID/start; EPERM signal-zero requires a complete valid process inventory. Unknown cleanup stops the series. See [runner contract](../verification/task131-runner-decisions.md).
- `detail-relations-*` separates functional checks, 5+20 latency gates and copy-only 3+5 diagnostics. Keep instrumentation out of product source; serialize benchmark windows.

- Benchmarks generate documents only in disposable temp roots, never managed repo memory.
- Separate filesystem/service timings, payload bytes, browser render timings, and build assets.
- Report warmups/sample counts and failures honestly; first process read does not prove OS-cold disk performance.
- `--keep-fixture` explicitly retains a benchmark temp root for HTTP/browser checks; its caller cleans it up after verification.
