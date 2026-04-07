+++
doc_kind = "task"
id = "TASK-040"
title = "Add a human-reviewed migration guide and direct agent brief for adoption"
summary = "Generate a repo-local migration guide plus an agent brief that the user can review and paste directly to Codex or Claude Code during external adoption."
status = "done"
spec_ids = ["SPEC-010"]
depends_on = []
blocked_by = []
priority = 1
owner_role = "planner"
created_at = "2026-04-07T17:18:55.558Z"
completed_at = "2026-04-07T17:56:36.837Z"
tags = ["adoption", "migration", "brief"]
updated_at = "2026-04-07T17:56:36.837Z"
+++

# Scope

- Generate a repo-local migration guide during adoption that explains what the scaffold is for, where the real source specs/docs live, and how the repo should move into managed `spm` memory.
- Generate a direct agent brief that the human user can review and then paste to Codex or Claude Code instead of relying on repo-generated prompts being interpreted strongly on their own.
- Cover the partially adopted case explicitly, including when `spm` already exists in the repo but the managed memory, AGENTS files, skills, statuses, dependencies, or source-spec migration work are still incomplete.
- Make the user-mediated adoption loop explicit:
  - the user runs an `spm` command
  - `spm` returns an intelligent prompt/brief plus migration guidance
  - the user copies that brief and gives it directly to the current coding agent
  - the agent uses the brief together with the repo state to keep adoption aligned
- Make the guide and brief explain why `spm` exists in the adopted repo: local project-memory management, deterministic status/dependency handling, AGENTS upkeep, skill usage, and built-in UI visibility.
- Preserve the distinction between:
  - scaffold tasks as the migration backlog
  - real project specs as the source material
  - the adopted repo's actual product roadmap
- Ensure the brief tells the agent to use the scaffold to migrate existing docs into managed specs/tasks rather than replacing the scaffold prematurely.
- Make the brief tell the agent to check for needed changes in partially adopted repos before assuming the migration is complete, especially around:
  - converting legacy specs into the managed shape
  - fixing spec/task statuses and dependencies
  - updating `AGENTS.md` budgets, context, and `spm` usage guidance
  - installing or creating the right local skills
  - making the repo render meaningfully in `spm ui`

# Done Looks Like

- `spm init` can create a human-readable migration guide file in the adopted repo.
- Adoption flows can generate a direct agent brief that the user can hand to Codex or Claude Code.
- The generated brief is written for user handoff, not silent repo-side prompt injection: the user can copy it and paste it to the current agent directly.
- The guide/brief can explain what still needs to change in a partially adopted repo instead of only handling fresh adoption.
- The migration guide/brief explains scaffold purpose, real source docs, AGENTS expectations, skill usage, and the value of `spm ui`.
- The guide/brief makes it obvious that `spm` is a context-management helper that deterministically reduces bookkeeping work for the agent rather than changing the adopted repo's product direction.
- Another agent no longer needs a manually written prompt like the Nina example to understand how to start adopting the standard.
