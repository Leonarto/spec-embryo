+++
doc_kind = "task"
id = "TASK-003"
title = "Add prompt-return mode and subprocess backend adapters"
summary = "Return structured context and prompts when an AI is already calling the tool, with future-ready subprocess adapters."
status = "done"
spec_ids = ["SPEC-001"]
depends_on = ["TASK-002"]
blocked_by = []
priority = 2
owner_role = "orchestrator"
tags = ["v1", "backends"]
updated_at = "2026-04-03T02:09:56.455Z"
+++

# Scope

Prompt-return should be first-class. Spawning another AI should be opt-in rather than assumed.

# Notes

Adapters should keep backend-specific behavior behind a shared interface.
