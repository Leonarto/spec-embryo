+++
doc_kind = "task"
id = "TASK-005"
title = "Add CLI flows to create specs and tasks inside the managed memory home"
summary = "Implement deterministic create/update commands so the CLI can manage spec and task docs inside the managed memory home instead of relying on manual edits."
status = "done"
spec_ids = ["SPEC-002"]
depends_on = ["TASK-004"]
blocked_by = []
priority = 1
owner_role = "builder"
tags = ["self-hosting", "cli", "creation"]
updated_at = "2026-04-03T01:23:01.419Z"
+++

# Scope

Let the tool manage the very project-memory artifacts it expects future repos to maintain. Start with deterministic status mutation, then add deterministic spec/task creation.

# Done Looks Like

- `spm spec create` exists
- `spm task create` exists
- `spm spec set-status` exists
- `spm task set-status` exists
- created docs land in the configured managed memory home
- IDs and frontmatter are generated deterministically
