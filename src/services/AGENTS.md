# AGENTS

Reusable deterministic product services.

- Memory owns context, match reasons, sections, tags and scope.
- Context-pack reports omissions; keep typed `nextInspect` and legacy refs aligned.
- Resume: `resume-window.ts` resolves committed windows; `resume-snapshot.ts` fingerprints selected context; `resume-render.ts` bounds UTF-8 prompts. Reuse shared versioning.
- `document-provenance.ts` hashes each NEW read Buffer on its published object, including verified memo hits. Never transfer WeakMap hashes or invent provenance.
- Harness runtime/probes are bounded; artifacts are isolated. Unknown trees retain files; diagnosis is explicit.
- Hooks preserve owned entries and contained paths; context workers emit references only.
- `harness-native.ts` never retains transcripts; `harness-receipts.ts` requires opt-in and exact root/session identity.
- Run handoffs require dirty-byte guards and a readonly lock lease. Exclude only its exact untracked owner; stale/incomplete guards never write. Evidence errors preserve process/native results.
- Adoption shares bounded guidance.
- UI: verified builds or explicit DEV.
- Workspace lists/options are bounded; `workspace-detail.ts` shares request context. No cached contexts/DTOs. Keys preserve URL intent; expose clamping/unavailable filters.
- Loading owns IO. `detail-relations.ts` bounds v2 windows; legacy stays full. sourceRevision differs from exact-file specRevision.
- Dashboard/Timeline use projection-local indexes; spec/card lookup is first-match, task lookup last-ID. Timeline adapter/contract own safe v2 units, diagnostics and bounded pages; legacy graph APIs unchanged.
- `spec-questions.ts`: shared normalization/errors; contradictory nonblank duplicates fail, equal trimmed answers preserve occurrences.
