# AGENTS

This folder contains reusable deterministic product services.

- Keep services reusable, deterministic, and light on side effects so commands, scripts, and later server mode can share them.
- Put cross-command workflow logic here, not in handlers or route files.
- Dashboard- and timeline-specific shaping should be projections over canonical repo state, never a second state system.
- Spec section parsing, adoption inspection, doctor findings, and adoption guidance belong here so `init`, `doctor`, and UI flows stay aligned.
- Adoption guidance must clearly distinguish temporary onboarding scaffold from the adopted repo's real product memory so another agent does not treat seed docs as literal backlog.
- Adoption guidance should also explain what `spm` is, when it should be used, and which deterministic responsibilities it already handles for the next agent.
- Adoption guidance should produce a repo-local migration guide plus a direct agent brief that the human can copy to the active coding agent.
- That guidance should explicitly cover partially adopted repos, including AGENTS, skills, status/dependency cleanup, and `spm ui` readiness checks.
- Doctor-style adoption services should also surface when the running CLI is newer than the repo's recorded `tool_version`, without depending on remote registry checks.
- Doctor-style validation should return structured findings even when some files fail to parse.
- UI launch helpers must use packaged web assets and choose the first available local port deterministically so multiple repos can run `spm ui` side by side.
- AGENTS budget logic belongs here too; it should read project-standard context policy from `.specpm/config.toml` rather than baking model assumptions into `AGENTS.md`.
