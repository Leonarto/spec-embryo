# AGENTS

This folder contains reusable deterministic product services.

- Keep services reusable, deterministic, and light on side effects.
- Put cross-command workflow logic here, not in handlers.
- Dashboard- and timeline-specific shaping should be projections over canonical repo state, never a second state system.
- Spec parsing, adoption inspection, doctor findings, and adoption guidance belong here so `init`, `doctor`, and UI stay aligned.
- Memory retrieval, link, and brief services should reuse canonical `ProjectContext` data, typed relations, deterministic neighborhoods, explicit match reasons, and spec-friendly ranking.
- Adoption guidance must distinguish temporary onboarding scaffold from the adopted repo's real product memory.
- Adoption guidance should explain what `spm` is, when to use it, and which deterministic work it already handles.
- Adoption guidance should produce a repo-local migration guide plus a direct agent brief for the human to paste, and it should cover partially adopted repos, including AGENTS, skills, status/dependency cleanup, and `spm ui` readiness checks.
- Doctor-style services should surface newer CLI `tool_version` guidance and structured findings even when some files fail to parse.
- Doctor-style human output should stay concise by default; reserve long adoption guidance and the full direct brief for explicit verbose or JSON reads.
- UI launch helpers must use packaged web assets and choose the first available local port so multiple repos can run `spm ui` side by side.
- AGENTS budget logic belongs here too; it should read project-standard context policy from `.specpm/config.toml` rather than baking model assumptions into `AGENTS.md`.
