# AGENTS

This folder contains reusable deterministic product services.

- Keep services reusable, deterministic, and light on side effects.
- Put cross-command workflow logic here, not in handlers.
- Dashboard, adoption, and doctor services should project canonical repo state instead of inventing a second state system.
- Memory retrieval/link/brief/note services should reuse canonical `ProjectContext`, explicit match reasons, section-aware indexing, normalized tag semantics, and scope write-policy enforcement.
- Context-pack services should keep compaction explicit; if changed-file or other supporting detail is truncated out of the active pack, surface that omission deterministically instead of making callers infer it from missing entries.
- Adoption/doctor guidance must explain what `spm` already handles, distinguish scaffold from real repo memory, write the migration-guide/direct-agent-brief pair, and surface version-aware capability refresh plus adoption-artifact drift against the same post-init contract.
- Nexus services keep Nexus external, dry-run before writes, and preserve `spm` ownership of AGENTS/config.
- Doctor human output stays concise by default; long guidance and the direct brief belong to verbose or JSON reads.
- UI launch helpers must use packaged web assets and choose the first available local port so multiple repos can run `spm ui` side by side.
- AGENTS budget logic belongs here too; it should read project-standard context policy from `.specpm/config.toml` rather than baking model assumptions into `AGENTS.md`.
