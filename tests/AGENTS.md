# AGENTS

- Isolate git/lock/process/package tests; update `spm tests diagnose` when sensitivities change. Prefer focused assertions to brittle snapshots.
- Harness fixtures use fake executables, temp installs and child trees to test provenance, fingerprints, UTF-8 bounds, root instructions, probes, capture, ownership, deadlines and cleanup; never run paid agents.
- Native/guard/receipt suites protect bounded parsing, exact sessions, NUL paths, dirty-byte conflicts, minimal evidence, leases and canonical handoff. Synthetic fixture provenance lives in `fixtures/harness/`.
- Inspector suites cover URL/history ownership, transport races, SSR404 and stable reader modes.
- Workspace tests protect index parity, query/archive/paging, request reuse, payload bounds and refresh ownership. Table helpers protect focus/ranges/preferences/TSV; Specs consumer tests separate canonical status from taskScope/subset progress; browser evidence in `web/verification/` uses isolated fixtures.
- Graph compatibility compares full outputs to the hash-pinned `fixtures/graph-baseline/` oracle (import-only adaptation), with frozen inputs and 10k fixtures.
- Document-reader tests cover shared admission, failure cleanup, freshness and byte provenance.
- Spec-answer suites cover revision races, atomic commit/cleanup and post-commit warnings against the pinned legacy oracle.
