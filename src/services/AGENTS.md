# AGENTS

This folder contains reusable deterministic product services.

- Keep services reusable, deterministic, and light on side effects.
- Put cross-command workflow logic here, not in handlers.
- Dashboard, adoption, and doctor services should project canonical repo state.
- Memory retrieval/link/brief/note services should reuse canonical `ProjectContext`, explicit match reasons, section-aware indexing, normalized tag semantics, and scope write-policy enforcement.
- Context-pack services should keep compaction explicit; surface truncated detail deterministically instead of making callers infer it.
- When context-pack detail is offloaded, keep both typed `nextInspect` entries and legacy `nextInspectIds` aligned with the highest-value omitted refs so prompt-return callers get a deterministic expansion trail.
- Adoption/doctor/agent-brief guidance should share one deterministic contract, including scaffold-vs-real-repo framing, workflow-loop commands, doctor-mode commands, memory-workflow commands, direct-agent command suggestions, capability-refresh command suggestions, adoption artifacts, capability refresh, and the bounded external AGENTS snippet.
- Nexus services keep Nexus external, dry-run before writes, and preserve `spm` ownership of AGENTS/config.
- Doctor human output stays concise by default; long guidance belongs to verbose or JSON reads.
- UI launch helpers must use packaged web assets and choose the first available local port so multiple repos can run `spm ui` side by side.
- AGENTS budget logic belongs here too; it should read project-standard context policy from `.specpm/config.toml` rather than baking model assumptions into `AGENTS.md`.
