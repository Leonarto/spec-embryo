# AGENTS

- Isolate git/lock/process/package tests; update `spm tests diagnose` when sensitivities change. Prefer focused assertions to brittle snapshots.
- Harness fixtures use fake executables, temp installs and child trees to test provenance, fingerprints, UTF-8 bounds, root instructions, probes, capture, ownership, deadlines and cleanup; never run paid agents.
- Native/guard/receipt suites protect bounded parsing, exact sessions, NUL paths, dirty-byte conflicts, minimal evidence, leases and canonical handoff. Synthetic fixture provenance lives in `fixtures/harness/`.
- Detail suites cover v2 windows, URL/history, revision races, drafts, SSR404 and focus.
- Workspace tests protect index parity, query/archive/paging, payload bounds and refresh ownership. Tables cover focus/ranges/preferences/TSV; Specs separates status from taskScope/subset progress. Browser evidence in `web/verification/` uses isolated fixtures.
- Graph compatibility compares full outputs to the hash-pinned `fixtures/graph-baseline/` oracle (import-only adaptation), with frozen inputs and 10k fixtures.
- Reader/memo tests cover fresh IO/provenance, true LRU eviction, aliases, mutable copies, failure recovery and concurrent completions.
- Spec-answer suites cover revision races, atomic commit/cleanup and post-commit warnings against the pinned legacy oracle.
