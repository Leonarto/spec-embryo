# AGENTS

This folder contains reusable deterministic product services.

- Keep services reusable, deterministic, and light on side effects.
- Put cross-command workflow logic here, not in handlers.
- Dashboard-, adoption-, and doctor-facing shaping should project canonical repo state instead of inventing a second state system.
- Memory retrieval/link/brief/note services should reuse canonical `ProjectContext`, explicit match reasons, section-aware indexing, normalized tag semantics, and scope write-policy enforcement.
- Adoption guidance must distinguish temporary onboarding scaffold from the adopted repo's real product memory and explain what `spm` already handles.
- Nexus services keep Nexus external, dry-run before writes, and preserve `spm` ownership of AGENTS/config.
- Adoption guidance should produce a repo-local migration guide plus a direct agent brief, including AGENTS, skills, cleanup, and `spm ui` readiness checks for partial adoption.
- Adoption and doctor guidance should also expose current SpM workflow capabilities and version-aware capability refresh when the installed CLI is newer than the repo's recorded tool version.
- Doctor-style services should surface newer CLI `tool_version` guidance and findings even when some files fail to parse.
- Doctor human output stays concise by default; long guidance and the direct brief belong to verbose or JSON reads.
- UI launch helpers must use packaged web assets and choose the first available local port so multiple repos can run `spm ui` side by side.
- AGENTS budget logic belongs here too; it should read project-standard context policy from `.specpm/config.toml` rather than baking model assumptions into `AGENTS.md`.
