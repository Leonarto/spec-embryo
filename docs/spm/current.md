+++
doc_kind = "current-state"
id = "CURRENT"
title = "Current Project State"
summary = "TASK-049 is done: spm memory brief now compresses managed memory into compact implementation, review, or migration context for docs, specs, tasks, and topic queries."
focus = "Start TASK-050 by teaching external adoption how tags support memory retrieval and query quality."
active_spec_ids = ["SPEC-013"]
active_task_ids = []
blocked_task_ids = []
next_action_hints = ["Document how legacy topical labels should be preserved as retrieval-friendly tags during adoption.", "Keep tag guidance soft-normalized rather than introducing a hard taxonomy in v1.", "Update migration artifacts so external repos understand why tags matter for memory query and brief flows."]
last_handoff_id = "HANDOFF-20260402T163915"
updated_at = "2026-04-08T16:23:26.387Z"
tags = ["v1", "self-hosting", "spec-workflow", "ui"]
+++

# Current State

This file is the explicit checkpoint for interrupted work. It should answer:

- what the project is trying to do right now
- which specs and tasks are active
- what should happen next
- what is blocked
- where a future human or agent should resume

## Narrative

The repo is now recursive enough to carry its own managed roadmap and core workflows. The CLI can mutate status, create new spec/task docs with deterministic IDs and back-links, and treat `review` as a real task stage instead of a board-only placeholder. The local visual server still exposes the four-view workspace, and spec detail pages can now turn answered open questions into durable file-backed decisions instead of leaving them trapped in chat history.

## Notes

- Prompt-return mode remains first-class to avoid unnecessary nested agent spawning.
- New substantive specs should follow the explicit draft -> user iteration -> review -> fix loop.
- The repo should increasingly manage itself through `docs/spm/` and `spm` commands instead of ad hoc memory.
- The local visual server should stay mostly read-only apart from narrow deterministic mutation flows such as answering spec open questions from the detail view.
