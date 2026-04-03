+++
doc_kind = "current-state"
id = "CURRENT"
title = "Current Project State"
summary = "SPEC-008 is complete: the grouped timeline now supports URL-driven task selection, highlights immediate and transitive dependency neighborhoods, and emphasizes related spec groups for cross-spec diagnosis."
focus = "Choose the next spec or workflow slice after closing SPEC-008."
active_spec_ids = []
active_task_ids = []
blocked_task_ids = []
next_action_hints = ["Pick the next active spec from the managed roadmap before starting implementation.", "Use timeline selection links during reviews or handoffs when dependency context matters.", "If cross-spec work starts to feel crowded, consider a future detail panel or connector overlay rather than moving graph logic into the route."]
last_handoff_id = "HANDOFF-20260402T163915"
updated_at = "2026-04-03T17:33:43.784Z"
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
