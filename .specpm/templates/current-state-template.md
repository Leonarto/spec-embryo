+++
doc_kind = "current-state"
id = "CURRENT"
title = "Current Project State"
summary = "Building the first usable local-first Spec Embryo foundation."
focus = "Ship the first usable Spec Embryo workflow around init, status, resume, handoff, spec list, and task list."
active_spec_ids = ["SPEC-001"]
active_task_ids = ["TASK-001", "TASK-002"]
blocked_task_ids = []
next_action_hints = ["Verify init/status/resume flows against the seed repo files.", "Keep the file-backed storage layer stable before adding server mode."]
updated_at = "2026-04-02T00:00:00Z"
tags = ["v1", "seed"]
+++

# Current State

This file is the explicit checkpoint for interrupted work. It should answer:

- what the project is trying to do right now
- which specs and tasks are active
- what should happen next
- what is blocked
- where a future human or agent should resume

## Narrative

The immediate goal is to establish a strong deterministic core. The repo itself is the durable memory system, so the first slice prioritizes file formats, linking, validation, and resume ergonomics before any local server or remote backend exists.

## Notes

- Prompt-return mode is first-class to avoid unnecessary nested agent spawning.
- Subprocess agent backends are adapters, not the center of the product.
