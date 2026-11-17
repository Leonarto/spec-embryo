+++
doc_kind = "task"
id = "TASK-038"
title = "Tighten adoption scaffold guidance for external repos"
summary = "Make init and doctor orient agents toward the adopted repo's real product, warn when scaffold is still present, and avoid reseeding onboarding docs into already adopted repos."
status = "done"
spec_ids = ["SPEC-010"]
depends_on = []
blocked_by = []
priority = 1
owner_role = "planner"
created_at = "2026-04-04T16:22:25.610Z"
completed_at = "2026-04-04T16:24:27.649Z"
tags = ["adoption", "llm", "doctor"]
updated_at = "2026-04-04T16:24:27.649Z"
+++

# Scope

- Rewrite the default adoption seed docs so they explain Spec Embryo as local project memory for the adopted repo rather than as product work to implement.
- Improve init/doctor guidance so both human-readable output and JSON orient another agent toward the adopted repo's real product direction.
- Ensure rerunning `spm init` in an already adopted repo does not create extra onboarding specs/tasks on top of real managed memory.
- Add deterministic tests that lock the new adoption behavior in place.

# Done Looks Like

- Seed specs/tasks explicitly describe themselves as temporary onboarding scaffold for adoption.
- `doctor` warns when onboarding scaffold is still present and tells the next agent not to treat it as the adopted repo's literal roadmap.
- `init` only seeds scaffold when a repo has no managed specs/tasks yet.
- Tests cover the new guidance and no-reseed behavior.
