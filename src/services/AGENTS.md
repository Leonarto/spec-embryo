# AGENTS

This folder contains reusable deterministic product services.

- Keep services reusable, deterministic, and light on side effects.
- Put cross-command workflow logic here, not in handlers.
- Product surfaces project canonical local state through structured data.
- Memory retrieval/link/brief/note services should reuse canonical `ProjectContext`, explicit match reasons, section-aware indexing, normalized tag semantics, and scope write-policy enforcement.
- Context-pack compaction explicitly reports omitted detail.
- Resume: `resume-window.ts` resolves committed windows; `resume-snapshot.ts` fingerprints selected context; `resume-render.ts` bounds UTF-8 prompts. Reuse shared versioning.
- `document-provenance.ts` hashes the Buffer parsed by repository loading. Preserve object identity; no rereads, clone hash transfer, or invented provenance.
- `harness-process.ts` owns bounded capture/termination; `harness-artifacts.ts` owns per-run reservations and verified cleanup. Unknown trees retain files; no stale-directory sweep.
- When context-pack detail is offloaded, keep typed `nextInspect` entries and legacy `nextInspectIds` aligned with the highest-value omitted refs.
- Adoption, doctor, and agent briefs share one guidance contract, including memory, Nexus, refresh, and bounded AGENTS snippets.
- Nexus services keep Nexus external, dry-run before writes, and preserve `spm` ownership of AGENTS/config.
- Doctor human output stays concise by default; long guidance belongs to verbose or JSON reads.
- UI launch uses packaged assets and the first available local port for concurrent repos.
- AGENTS budget logic belongs here too; it should read project-standard context policy from `.specpm/config.toml` rather than baking model assumptions into `AGENTS.md`.
