+++
doc_kind = "current-state"
id = "CURRENT"
title = "Current Project State"
summary = "TASK-048 is done: spm memory links now exposes grouped outgoing relations, backlinks, and deterministic neighborhoods with compact human output and stable JSON."
focus = "Start TASK-049 by turning indexed memory and link neighborhoods into compact working briefs."
active_spec_ids = ["SPEC-013"]
active_task_ids = []
blocked_task_ids = []
next_action_hints = ["Reuse both memory-query and memory-links bundles when composing briefs instead of recomputing retrieval state.", "Keep brief output compact by default and profile-driven only where it changes emphasis.", "Add focused coverage for spec, task, and topic-oriented brief entry modes."]
last_handoff_id = "HANDOFF-20260402T163915"
updated_at = "2026-04-08T16:17:53.838Z"
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
