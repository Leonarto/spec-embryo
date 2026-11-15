# AGENTS

This folder contains deterministic maintenance scripts.

- Scripts should stay dependency-light and runnable with Bun.
- Prefer scripts for repeatable repo checks instead of burying policy in prose only.
- If a script becomes part of normal product behavior, move its core logic into `src/services/` and keep the script thin.
- Keep output concise and CI-friendly.
- `graph-benchmark.ts` separates computation from filesystem/agents IO; use serial samples and distinguish bounded baseline probes from timings.
