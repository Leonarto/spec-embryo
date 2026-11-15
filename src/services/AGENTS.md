# AGENTS

This folder contains reusable deterministic product services.

- Keep services reusable, deterministic, and light on side effects.
- Put cross-command workflow logic here, not in handlers.
- Dashboard, adoption, doctor, portfolio, profile, import, hooks, release, and test-diagnostic services should project canonical local state through structured data.
- Memory retrieval/link/brief/note services should reuse canonical `ProjectContext`, explicit match reasons, section-aware indexing, normalized tag semantics, and scope write-policy enforcement.
- Context-pack services should keep compaction explicit; surface truncated detail deterministically instead of making callers infer it.
- When context-pack detail is offloaded, keep typed `nextInspect` entries and legacy `nextInspectIds` aligned with the highest-value omitted refs.
- Adoption/doctor/agent-brief guidance should share one contract for adoption, workflow, memory, Nexus, capability-refresh, and bounded AGENTS snippet guidance.
- Nexus services keep Nexus external, dry-run before writes, and preserve `spm` ownership of AGENTS/config.
- Doctor human output stays concise by default; long guidance belongs to verbose or JSON reads.
- UI launch helpers must use packaged web assets and choose the first available local port so multiple repos can run `spm ui` side by side.
- AGENTS budget logic belongs here too; it should read project-standard context policy from `.specpm/config.toml` rather than baking model assumptions into `AGENTS.md`.
