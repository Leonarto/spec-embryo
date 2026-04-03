+++
doc_kind = "task"
id = "TASK-015"
title = "Add archival and restore flows for closed tasks"
summary = "Implement deterministic archive commands and repository behavior so old closed work leaves the active board without losing history."
status = "done"
spec_ids = ["SPEC-005"]
depends_on = ["TASK-014"]
blocked_by = []
priority = 1
owner_role = "builder"
completed_at = "2026-04-03T03:06:02.905Z"
tags = ["archival", "cli", "workflow"]
updated_at = "2026-04-03T03:06:02.905Z"
+++

# Scope

- Add deterministic archive and restore flows for closed tasks.
- Keep archived work durable and inspectable while removing it from active-flow views by default.
- Build these flows on top of the lifecycle timestamps added in `TASK-014`.

# Done Looks Like

- The CLI can archive eligible closed tasks deterministically.
- The CLI can restore archived tasks deterministically.
- The repository layer preserves closed-task history while active-board views can exclude archived work by default.
