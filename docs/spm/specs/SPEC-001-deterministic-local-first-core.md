+++
doc_kind = "spec"
id = "SPEC-001"
title = "Establish the deterministic local-first core"
summary = "Define the file-backed, spec-first architecture and ship the first usable CLI workflow."
status = "done"
task_ids = ["TASK-001", "TASK-002", "TASK-003", "TASK-004", "TASK-005", "TASK-006"]
tags = ["v1", "foundation", "cli"]
owner = "human-ai"
updated_at = "2026-04-03T16:20:43.740Z"
+++

# Problem

AI-assisted software work loses continuity when the current state only lives in chat history or an external task tracker.

# Goals

- Keep repo memory local and readable.
- Make specs central and tasks explicitly linked.
- Support deterministic status and resume flows without any LLM.
- Leave room for prompt-return and subprocess backends later.

# Non-Goals For V1

- No web UI yet.
- No database dependency.
- No mandatory hosted service.
