+++
doc_kind = "task"
id = "TASK-006"
title = "Add CLI support for updating current state and checkpointing work"
summary = "Expand the CLI so agents can update current state and write checkpoint context with less manual editing."
status = "done"
spec_ids = ["SPEC-002"]
depends_on = ["TASK-005"]
blocked_by = []
priority = 2
owner_role = "planner"
tags = ["self-hosting", "state", "handoff"]
updated_at = "2026-04-03T01:43:45.618Z"
+++

# Scope

Reduce the gap between status inspection and state maintenance.

# Done Looks Like

- the CLI can update focus/summary/active IDs in the current state file
- checkpoint or handoff flows are easier to trigger deterministically
- the Spec Embryo repo can maintain its own live state with less manual friction
