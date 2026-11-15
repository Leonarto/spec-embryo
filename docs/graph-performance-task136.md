# TASK-136 — exact-compatible graph checkpoint

The shared engine and dashboard now use iterative graph analysis and projection-local indexes. Public function signatures, DTOs and serialized results are unchanged. This checkpoint does not implement TASK-130's diagnostics, nonfinite/unavailable-placement contract or Timeline UI.

## Compatibility and implementation

The pre-change oracle is pinned to commit `cd01b72841f7203f085708d5e08ed9224efa5cd1`. `tests/fixtures/graph-baseline/provenance.json` records the source hashes: engine `7e1565a50bdf24aad28dbd6c788a6a4dfd28702ac973705b5d4387ac7b8c9943`, dashboard `fa23f3a595289435eef3479229109dd66736c6e82862cb2ddb62a817c5bcd4ee`. The `.source` files preserve committed bytes; executable copies adapt import paths only. A test verifies hashes and the complete raw-to-executable import-only transformation before comparing outputs. The oracle is test-only and must not be updated to bless an implementation difference.

- Critical-path DFS uses explicit frames and append-only linked path records, then materializes only the final chosen path. The longest-path comparison remains strict `>` in dependency/source order. Cycle fallback still returns the repeated task and checks the cache first.
- Timeline placement uses explicit frames and an active-path set. Cache lookup still precedes cycle detection; a cycle's zero-start placement is cached, then overwritten when its ancestor completes. Effort and nonfinite behavior are unchanged.
- Status uses one `TaskAnalysisIndex`; dashboard card conversion uses one separate index. This removes per-card downstream scans while preserving the existing duplicate dependency counting rule.
- Selected trace uses a queue cursor rather than `shift()`, computes closure only for the requested known task, and uses local membership sets for row/group classification. Output arrays retain repeats, BFS order and cyclic self-reachability.
- Projection-local lookups replace group `.find()` calls and facade card scans. Task-map lookup remains last-ID-wins. Group spec labels and facade linked-task `.find()` equivalents remain first-match-wins. Sorting, archived/window rules and active/all filtering remain intact. There are no cross-request caches or new public exports.

The differential suite compares complete status, resume, next actions, cards, Timeline groups/rows/selection and dashboard facade outputs. It includes 80 seeded small DAG/cyclic fixtures, missing/repeated references, duplicate task/spec IDs, strict ties, closed statuses, archive/lifecycle windows, unknown/absent/valid selection, and frozen inputs. Reverse-ordered 10k chain and 10k-task/2k-spec/30k-edge cases verify completion without relying on recursive call depth.

## Measurement protocol

Run `bun scripts/graph-benchmark.ts /private/tmp/spm-task136-benchmark.json`. The committed [raw results](graph-performance-task136.json) contain all samples, source hashes and fixture/runtime metadata. Source hashes identify the exact implementation measured, before its final integration commit.

Measurement window: **2026-11-15 21:13:14.458–21:14:11.650 UTC**. Parent and UI implementer explicitly reserved the interval: no concurrent builds, browser-heavy validation or test suites; editing could continue. Machine: Apple M1 Pro, 10 logical CPUs, 16 GiB RAM, macOS Darwin 25.2.0 arm64, Bun 1.3.9.

Each sampled phase has 5 warmups followed by 20 serial samples. Median is the mean of samples 10/11 after sorting; p95 uses nearest rank. GC runs before each pure phase, outside timed samples. Fixtures and Timeline input cards are prepared before timing. Pure dashboard runs stub only context loading and AGENTS reporting, so its complete projection work is measured separately from filesystem/Git/AGENTS work. No network/model calls occur.

Fixtures: reverse source order forces the initial traversal to visit the full dependency depth. The chain fixtures have 1k/10k tasks, 999/9,999 edges and one spec. The volume fixture has exactly 10k tasks, 2k specs and 30k existing DAG edges: up to three immediate predecessors, plus six extra earlier edges to reach 30k. The selected task is near the middle of source order.

| Loaded-context operation | 1k chain baseline median/p95 ms | 1k chain optimized median/p95 ms | 10k chain optimized median/p95 ms | 10k/2k/30k optimized median/p95 ms |
| --- | ---: | ---: | ---: | ---: |
| Status | 53.014 / 56.453 | 1.058 / 1.510 | 10.707 / 13.200 | 15.626 / 21.087 |
| Timeline, no trace | 4.677 / 6.570 | 0.470 / 0.715 | 4.641 / 5.721 | 5.580 / 7.245 |
| Timeline, selected trace | 6.137 / 7.841 | 0.861 / 1.010 | 7.903 / 10.489 | 12.466 / 14.726 |
| Full dashboard facade, selected trace | 125.385 / 129.366 | 3.025 / 5.251 | 32.800 / 35.909 | 42.570 / 46.106 |

The large baseline was probed separately in isolated `--smol` children with an 8s deadline, rather than running repeated allocation-heavy phases. These are **single probes, not comparable latency distributions**. Chain status completed in 6,416.7 ms; unselected/selected Timeline completed in 1,010.6/1,140.8 ms. Volume unselected/selected Timeline completed in 1,139.0/1,196.5 ms. Chain facade, volume status and volume facade reached the deadline and were killed (exit 137). No baseline stack-overflow claim is made: Bun did complete some recursive large probes. Algorithm inspection establishes removal of recursive frames, cloned ancestor sets, critical-path prefix copying, per-node downstream scans and repeated membership/group searches.

A separate disposable real-file volume fixture measured warm loading at median/p95 **133.714/155.460 ms**, AGENTS reporting at **5.943/6.302 ms**, and the optimized complete facade with real IO at **265.191/339.256 ms**. Its files were cleaned afterward. This is local warm-filesystem evidence, not cold-cache, HTTP, rendering, accessibility or TASK-130/131 acceptance evidence.

## Validation scope

The final test/coverage checkpoint is run in `/private/tmp/spm-task136-isolated`: `git archive cd01b72841f7203f085708d5e08ed9224efa5cd1` plus only TASK-136 source/tests/script files, with existing root/web dependency directories symlinked. No dependencies are installed. Concurrent partial TASK-127 sources are excluded; TASK-127 and final integration retain their own gates. On a clean snapshot, run `bun run web:check` (which performs SvelteKit sync) **before** the SSR tests so `web/.svelte-kit/tsconfig.json` exists. The first attempt without sync had 318 passes and one SSR setup failure; after sync the complete suite passed. No product change was made for that setup failure.

Final commands/results: `bun run web:check` passed with zero errors/warnings; `bun test --coverage --coverage-reporter=text --coverage-reporter=lcov --coverage-dir=/private/tmp/spm-task136-coverage` passed **322 tests, zero failures, 6,965 assertions across 55 files in 49.48s**. This includes engine/dashboard/workspace and harness/resume regressions. `bun run check:agents` and scoped whitespace checks passed in the shared workspace, including the four coordinated guidance updates.

The [coverage counters](graph-coverage-task136.json) separate all 85 instrumented product files (`src/` and `web/`) from the three test-only fixture/oracle files. Product-only weighted LCOV coverage is **92.89% lines** (11,264/12,126) and **92.65% functions** (1,437/1,551). No instrumented product file is excluded. Test-only fixtures have 76.83% lines and 91.30% functions; they do not inflate the product gate. Bun's own all-files text presentation reports 91.43% lines and 91.11% functions. Changed product files report engine 90.48% lines/96.92% functions and dashboard 98.69% lines/100% functions in that text presentation.
