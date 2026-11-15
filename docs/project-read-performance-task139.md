# TASK-139 fresh project-read evidence

One FIFO admission queue per `loadProjectContext` now admits up to 64 fresh callback Buffer reads across current state, specs, tasks, handoffs and enabled session/org notes. Decoding, parsing and provenance still use the same read Buffer. Directory/config/Git reads, ordering, public signatures and errors retain their existing behavior. Independent context loads have independent queues. There is no cache, mtime shortcut, process-global semaphore, runtime change or atomic filesystem snapshot guarantee.

## Provenance and reproduction

Implementation and validation used an isolated `git archive` of `896ce55779f8250af89821e7dd8de95ca0cffa8f` at `/private/tmp/spm-task139-implementation`, with only this slice overlaid. Local dependencies were symlinked; nothing was installed. The shared repository, concurrent TASK-128 sources and private agent sessions were not read into this snapshot. TASK-128 integration is a separate gate after applying the reviewed patch.

The benchmark used Node v25.6.0, Apple M1 Pro, arm64, Darwin 25.2.0. Its quiet CPU window was explicitly granted by the Timeline implementer, then released immediately after completion. Run interval: 2026-11-15T23:53:13.277Z–23:53:28.719Z (15.442 seconds wall time). No accumulated CPU-time measurement is claimed. Baseline and production ran serially in the same process, five warmups followed by twenty measured fresh loads each. No alternative candidates or tuning were run in this final window.

[Raw samples and exact production/source hashes](project-read-performance-task139.json) retain every measured phase. Production repository SHA-256 is `43acf841fe2b0c7d60cefa05c83eb347b62d74af9ecff00360eccf6ba1c43880`; reader SHA-256 is `34c05d02b7c3d7196453781e2a4375bf6f26525d231fe7a5a86ad4620b9ade8d`. Baseline repository SHA-256 is `0d2ec8b8070a570002323fc8ae445e00708680468c31d2092a3e3c8fa0da5945`. Both module graphs use their own matching workspace/detail/provenance modules; no stubs or production instrumentation are present.

The synthetic fixture at `/private/tmp/spm-task138-profile-fixture-xsLPEH` contains 10,000 tasks, 2,000 specs, current state, no scoped notes and no Git repository. Every non-root task depends on TASK-00001. The versioned generator reproduces its document recipe; initialization timestamps and absolute paths differ between newly generated fixtures, so comparisons must use the same fixture for both implementations. The full context hash and byte-backed revision were identical across all 50 warmup/measured loads; raw samples retain both identities. Note membership is tested separately, rather than inferred from this zero-note timing fixture.

From the implementation repository, prepare a baseline checkout/archive with dependencies available, then run:

```sh
bun run scripts/project-read-fixture.ts
node scripts/project-read-benchmark.ts /absolute/baseline-source /printed/fixture-root /private/tmp/project-read-result.json
```

Coordinate a quiet CPU window first. The benchmark checks full context-value and revision equality outside its timed phases. It times context load, analysis/index creation, task-detail projection and JSON stringification separately. It does not measure HTTP, browser rendering, OS-cold IO or the end-to-end 300 ms gate. The helper scripts are verification tools and add no product CLI/API.

## Final Node measurements

Median is the mean of sorted samples 10 and 11; p95 is nearest-rank sample 19 of 20. Values are wall milliseconds.

| Phase | Baseline median | Production median | Baseline p95 | Production p95 |
| --- | ---: | ---: | ---: | ---: |
| Fresh context | 312.57 | 200.66 | 373.49 | 236.61 |
| Analysis/index | 10.26 | 9.42 | 14.29 | 11.21 |
| Task detail projection | 3.51 | 2.90 | 4.83 | 3.96 |
| JSON stringify | 7.36 | 6.91 | 9.79 | 7.57 |

Context p95 decreased by 36.6% in this run. Later phases are unchanged code and are reported for attribution, without claiming their small differences as algorithmic improvements. Fixed baseline-first ordering, warm filesystem state and same-process GC are practical limits of this local comparison. The full legacy fanout detail remains unbounded here; TASK-138 addresses relation projection and endpoint behavior separately.

## Correctness and coverage

`tests/document-reader.test.ts` checks FIFO admission, cap 64, two independent pools, Buffer identity, callback errors, synchronous setup throws, duplicate callbacks, iterative synchronous draining of a 10k tail and absence of unhandled rejections. `tests/project-read-freshness.test.ts` checks one real pool across all six document groups (501 documents), enabled note membership/policies, task/file and note-ID ordering, stable handoff ties, exact-byte provenance, same-size/restored-mtime changes, atomic replacement, enumeration rename/delete, parse/read failure recovery, supplied config identity, fresh config, symlink omission, invalid UTF-8 bytes and missing-current defaults. Already active IO can settle after fail-fast rejection; no new cancellation contract is introduced.

Validation in the isolated snapshot:

- `bun run web:check` before tests: 0 errors, 0 warnings. Svelte sync is required first for SSR tests in a clean archive.
- `bun test --coverage --coverage-reporter=text --coverage-reporter=lcov --coverage-dir=/private/tmp/spm-task139-coverage`: 347 pass, 0 fail, 7,680 assertions across 60 files; 55.35 seconds.
- `bun run check:agents`: pass after compacting the test guide within its existing cap.

Bun's displayed aggregate is 91.31% functions / 91.97% lines. The [LCOV weighted summary](project-read-coverage-task139.json) distinguishes product `src/` + `web/src/` (92.69% functions, 93.07% lines; 89 files) from test-only oracle/fixtures (91.30% functions, 76.83% lines; 3 files). All instrumented files together are 92.59% functions / 91.91% lines by LCOV counts. No real product file is excluded from the normal full-suite gate. The new reader has 100% function / 97.37% line coverage in Bun's table. This isolated validation does not certify later TASK-128 or TASK-130 deltas; the coordinator runs their targeted integration gates after applying the patch.
