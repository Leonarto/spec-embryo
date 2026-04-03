# AGENTS

Managed specs live here.

- One spec should describe a coherent slice of product intent or architecture.
- Keep linked `task_ids` current.
- Update specs when goals, non-goals, invariants, or interface contracts shift.
- Prefer stable intent and constraints here; execution detail belongs in tasks.
- If migrating from legacy docs, use `spm spec import-prompt --source ...` before rewriting spec files.
- When authoring or materially revising a spec, use `skills/spec-writer/SKILL.md`, iterate core decisions with the human user, then use `skills/spec-reviewer/SKILL.md` and fix the spec before treating it as ready.
