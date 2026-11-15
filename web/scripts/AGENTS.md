# AGENTS

- Benchmarks generate documents only in disposable temp roots, never managed repo memory.
- Separate filesystem/service timings, payload bytes, browser render timings, and build assets.
- Report warmups/sample counts and failures honestly; first process read does not prove OS-cold disk performance.
- `--keep-fixture` explicitly retains a benchmark temp root for HTTP/browser checks; its caller cleans it up after verification.
