# AGENTS

This folder contains reusable deterministic product services.

- Keep services reusable, deterministic, and light on side effects so commands, scripts, and later server mode can share them.
- Put cross-command workflow logic here, not in handlers or route files.
- Dashboard- and timeline-specific shaping should be projections over canonical repo state, never a second state system.
- Spec section parsing, adoption inspection, doctor findings, and adoption guidance belong here so `init`, `doctor`, and UI flows stay aligned.
- Memory retrieval services should index and traverse managed docs from canonical `ProjectContext` data, not a second parser.
- Adoption guidance must distinguish temporary onboarding scaffold from the adopted repo's real product memory.
- Adoption guidance should explain what `spm` is, when to use it, and which deterministic responsibilities it already handles for the next agent.
- Adoption guidance should produce a repo-local migration guide plus a direct agent brief for the human to paste, and it should cover partially adopted repos, including AGENTS, skills, status/dependency cleanup, and `spm ui` readiness checks.
- Doctor-style services should surface newer CLI `tool_version` guidance and still return structured findings when some files fail to parse.
- Doctor-style human output should stay concise by default; reserve long adoption guidance and the full direct brief for explicit verbose or JSON reads.
- UI launch helpers must use packaged web assets and choose the first available local port deterministically so multiple repos can run `spm ui` side by side.
- AGENTS budget logic belongs here too; it should read project-standard context policy from `.specpm/config.toml` rather than baking model assumptions into `AGENTS.md`.
