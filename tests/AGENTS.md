# AGENTS

- Prefer small focused tests over broad brittle snapshots.
- When a test touches git state, locks, subprocesses, or packaged UI paths, keep it isolated and update `spm tests diagnose` if the sensitive area changes.
- Harness context/diagnostic suites protect provenance, fingerprints, UTF-8 bounds, explicit probes and root instructions with fake executables.
- Harness process/hook suites use temp-only installs and child/tree fixtures for capture, ownership, deadlines and cleanup; never run paid agents.
- Native/guard/receipt suites protect bounded parsing, exact sessions, NUL paths, dirty-byte conflicts, minimal evidence, leases and canonical handoff. Synthetic fixture provenance lives in `fixtures/harness/`.
- Inspector suites cover URL/history ownership, transport races, SSR404 and stable reader modes.
- Workspace tests protect index parity, query/archive/paging, request reuse, payload bounds and refresh ownership. Table helpers protect focus/ranges/preferences/TSV; Specs consumer tests separate canonical status from taskScope/subset progress; browser evidence in `web/verification/` uses isolated fixtures.
- Graph compatibility compares full outputs to the hash-pinned `fixtures/graph-baseline/` oracle (import-only adaptation), with frozen inputs and 10k fixtures.
