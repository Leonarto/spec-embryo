# AGENTS

This folder contains reusable deterministic product services.

- Project canonical state through reusable deterministic services; keep handlers thin and side effects explicit.
- Memory services reuse canonical context, match reasons, section indexing, normalized tags, and scope write policies.
- Context-pack compaction explicitly reports omitted detail.
- Resume: `resume-window.ts` resolves committed windows; `resume-snapshot.ts` fingerprints selected context; `resume-render.ts` bounds UTF-8 prompts. Reuse shared versioning.
- `document-provenance.ts` hashes the Buffer parsed by repository loading. Preserve object identity; no rereads, clone hash transfer, or invented provenance.
- `harness-process.ts` owns bounded capture/termination; `harness-artifacts.ts` owns per-run reservations and verified cleanup. Unknown trees retain files; no stale-directory sweep.
- `harness-diagnostics.ts` projects explicit provider queries; `harness-probe.ts` owns allowlisted, bounded processes. Normal doctor and snippets never probe; root instruction inspection never certifies loading.
- `harness-hooks.ts` plans/applies owned native entries under the repository lock; `harness-paths.ts` checks containment and atomic file writes. `harness-hook-context.ts` uses a terminable read-only worker and emits only bounded reference metadata, never document text.
- When context-pack detail is offloaded, keep typed `nextInspect` entries and legacy `nextInspectIds` aligned with the highest-value omitted refs.
- Adoption surfaces share guidance and bounded snippets.
- UI launch uses packaged assets and the first available local port for concurrent repos.
- AGENTS budgets use project context policy from `.specpm/config.toml`.
