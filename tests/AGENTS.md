# AGENTS

Tests should protect deterministic behavior and source-of-truth parsing.

- Prefer small focused tests over broad brittle snapshots.
- Add tests when changing parsers, derivation rules, dependency handling, or CLI-critical formatting logic.
- Aim to keep repo coverage at 80% or higher.
- New code should normally land with tests in the same change.
- Keep fixtures minimal and readable.
- When a test touches git state, locks, subprocesses, or packaged UI paths, keep it isolated and update `spm tests diagnose` if the sensitive area changes.
