# AGENTS

This folder contains reusable deterministic product services.

- Keep services reusable, deterministic, and light on side effects so commands, scripts, and later server mode can share them.
- Put cross-command workflow logic here, not in handlers or route files.
- Dashboard- and timeline-specific shaping should be projections over canonical repo state, never a second state system.
- Spec section parsing, adoption inspection, doctor findings, and adoption guidance belong here so `init`, `doctor`, and UI flows stay aligned.
- Doctor-style validation should return structured findings even when some files fail to parse.
- UI launch helpers must use packaged web assets and choose the first available local port deterministically so multiple repos can run `spm ui` side by side.
- AGENTS budget logic belongs here too; it should read project-standard context policy from `.specpm/config.toml` rather than baking model assumptions into `AGENTS.md`.
