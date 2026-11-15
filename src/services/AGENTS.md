# AGENTS

Reusable deterministic product services.

- Memory: canonical context, match reasons, section index, tags, and scope policies.
- Context-pack reports omissions; keep typed `nextInspect` and legacy refs aligned.
- Resume: `resume-window.ts` resolves committed windows; `resume-snapshot.ts` fingerprints selected context; `resume-render.ts` bounds UTF-8 prompts. Reuse shared versioning.
- `document-provenance.ts` hashes the Buffer parsed by repository loading. Preserve object identity; no rereads, clone hash transfer, or invented provenance.
- Harness runtime/probes are bounded; artifacts are isolated. Unknown trees retain files; diagnosis is explicit.
- Hooks preserve owned entries and contained paths; context workers emit references only.
- `harness-native.ts` never retains transcripts; `harness-receipts.ts` requires opt-in and exact root/session identity.
- Run handoffs use independent dirty-byte guards and a verified readonly lock lease. Only its exact untracked owner may be excluded; stale/incomplete guards never write. Evidence errors preserve process/native results.
- Adoption surfaces share guidance and bounded snippets.
- UI launch: packaged assets and the first available local port.
- AGENTS budgets follow `.specpm/config.toml`.
- `workspace-query.ts`/`workspace.ts`: bounded lists/options, archive/sort/paging and SSR/JSON DTOs; request-local context/index only, no global cache or dashboard facade for lists.
- Refresh request keys encode URL intention before dataset normalization; report clamped pages and unavailable spec filters. Detail builders accept shared context; public wrappers remain compatible.
- Dashboard/Timeline reuse projection-local indexes; first-match spec/card lookup differs intentionally from last-ID task lookup.
