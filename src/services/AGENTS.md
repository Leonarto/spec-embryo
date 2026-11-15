# AGENTS

Reusable deterministic product services.

- Memory: canonical context, match reasons, section index, tags, and scope policies.
- Context-pack reports omissions; keep typed `nextInspect` and legacy refs aligned.
- Resume: `resume-window.ts` resolves committed windows; `resume-snapshot.ts` fingerprints selected context; `resume-render.ts` bounds UTF-8 prompts. Reuse shared versioning.
- `document-provenance.ts` hashes the Buffer parsed by repository loading. Preserve object identity; no rereads, clone hash transfer, or invented provenance.
- `harness-process.ts` owns bounded capture/termination; `harness-artifacts.ts` owns per-run reservations and verified cleanup. Unknown trees retain files; no stale-directory sweep.
- `harness-diagnostics.ts` projects explicit provider queries; `harness-probe.ts` owns allowlisted, bounded processes. Normal doctor and snippets never probe; root instruction inspection never certifies loading.
- `harness-hooks.ts` plans/applies owned native entries under the repository lock; `harness-paths.ts` checks containment and atomic file writes. `harness-hook-context.ts` uses a terminable read-only worker and emits only bounded reference metadata, never document text.
- Adoption surfaces share guidance and bounded snippets.
- UI launch: packaged assets and the first available local port.
- AGENTS budgets follow `.specpm/config.toml`.
- `workspace-query.ts`/`workspace.ts`: bounded lists/options, archive/sort/paging and SSR/JSON DTOs; request-local context/index only, no global cache or dashboard facade for lists.
- Refresh request keys encode URL intention before dataset normalization; report clamped pages and unavailable spec filters. Detail builders accept shared context; public wrappers remain compatible.
