# AGENTS

Reusable deterministic product services.

- Memory: canonical context, match reasons, section index, tags, and scope policies.
- Context-pack reports omissions; keep typed `nextInspect` and legacy refs aligned.
- Resume: `resume-window.ts` resolves committed windows; `resume-snapshot.ts` fingerprints selected context; `resume-render.ts` bounds UTF-8 prompts. Reuse shared versioning.
- `document-provenance.ts` hashes each NEW read Buffer on its published object, including verified memo hits. Never transfer WeakMap hashes or invent provenance.
- Harness runtime/probes are bounded; artifacts are isolated. Unknown trees retain files; diagnosis is explicit.
- Hooks preserve owned entries and contained paths; context workers emit references only.
- `harness-native.ts` never retains transcripts; `harness-receipts.ts` requires opt-in and exact root/session identity.
- Run handoffs use independent dirty-byte guards and a verified readonly lock lease. Only its exact untracked owner may be excluded; stale/incomplete guards never write. Evidence errors preserve process/native results.
- Adoption surfaces share guidance and bounded snippets.
- UI launch: packaged assets and the first available local port.
- Workspace lists/options are bounded; `workspace-detail.ts` shares request context. No cached contexts/DTOs. Keys preserve URL intent; expose clamping/unavailable filters.
- Loading owns root IO. `detail-relations.ts` bounds v2 windows; legacy stays full. Global revision differs from spec write tokens.
- Dashboard/Timeline reuse projection-local indexes; first-match spec/card lookup differs intentionally from last-ID task lookup.
- `spec-questions.ts`: shared normalization/errors; contradictory nonblank duplicates fail, equal trimmed answers preserve occurrences.
