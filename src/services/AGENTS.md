# AGENTS

This folder contains reusable deterministic product services.

- Keep services reusable, deterministic, and light on side effects.
- Put cross-command workflow logic here, not in handlers.
- Dashboard- and timeline-specific shaping should be projections over canonical repo state, never a second state system.
- Spec parsing, adoption inspection, doctor findings, and adoption guidance belong here so `init`, `doctor`, and UI stay aligned.
- Memory retrieval, link, and brief services should reuse canonical `ProjectContext` data, typed relations, deterministic neighborhoods, match reasons, section-aware body indexing, spec-friendly ranking, and normalized tag matching (`dark mode` == `dark-mode` == `dark_mode`, not partial substrings).
- Adoption guidance must distinguish temporary onboarding scaffold from the adopted repo's real product memory.
- Adoption guidance should explain what `spm` is, when to use it, and which deterministic work it already handles.
- If Nexus is configured, keep it external and enforce root AGENTS ownership stays with `spm`.
- Adoption guidance should produce a repo-local migration guide plus a direct agent brief, including AGENTS, skills, cleanup, and `spm ui` readiness checks for partial adoption.
- Doctor-style services should surface newer CLI `tool_version` guidance and findings even when some files fail to parse.
- Doctor human output stays concise by default; long guidance and the direct brief belong to verbose or JSON reads.
- UI launch helpers must use packaged web assets and choose the first available local port so multiple repos can run `spm ui` side by side.
- AGENTS budget logic belongs here too; it should read project-standard context policy from `.specpm/config.toml` rather than baking model assumptions into `AGENTS.md`.
