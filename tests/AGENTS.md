# AGENTS

- Prefer small focused tests over broad brittle snapshots.
- Add tests when changing parsers, derivation rules, dependency handling, or CLI-critical formatting logic.
- When a test touches git state, locks, subprocesses, or packaged UI paths, keep it isolated and update `spm tests diagnose` if the sensitive area changes.
- `harness-context.test.ts` protects selected-source byte provenance, canonical resume fingerprints, committed interruption windows, invariant prompt prefixes, and UTF-8 rendering budgets using isolated temporary repos.
- `harness-process.test.ts` uses local fake executables for concurrent artifacts, output draining, typed failures, timeout, and child/grandchild cancellation; never invoke paid agent APIs in these tests.
- `harness-diagnostics.test.ts` protects explicit bounded version/help probes and root-only instruction inspection; fake PATH executables keep tests independent of installed harnesses.
- `harness-hooks.test.ts` and `hook-context.test.ts` install only into temp fixtures; cover whole-entry ownership, partial writes, containment, input limits, and the parent deadline killing worker/Git descendants.
- Workspace tests protect index parity, query/archive/paging, request reuse, payload bounds and refresh ownership. Browser evidence in `web/verification/` uses isolated fixtures.
