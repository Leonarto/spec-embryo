# AGENTS

This is the managed Spec Embryo memory home for the project.

- `current.md` is the live project-state checkpoint.
- `handoffs/` stores durable interrupted-work history.
- `specs/` holds stable intent and constraints.
- `tasks/` holds linked execution slices.
- `skills/` holds managed project-local agent guidance.

Rules:

- Keep managed memory here, not at the repo root.
- Treat proposed specs as plans, not shipped capabilities; keep implementation status and user-confirmed scope explicit in `current.md`.
- If the layout standard changes, run `spm reshape` and then refresh these local AGENTS files.
