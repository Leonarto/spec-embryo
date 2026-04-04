+++
doc_kind = "current-state"
id = "CURRENT"
title = "Current Project State"
summary = "SPEC-012 remains active: shared workspace routes now rely on theme tokens instead of embedded light-only colors, and the next slice is to finish detail-view and Mermaid-specific dark-mode coherence."
focus = "Carry theme-aware styling into detail surfaces and Mermaid for TASK-037"
active_spec_ids = ["SPEC-012"]
active_task_ids = []
blocked_task_ids = []
next_action_hints = ["Start TASK-037 by aligning Mermaid and detail surfaces with the new semantic theme tokens.", "Keep dark-mode diagrams coherent with the rest of the workspace rather than treating them as isolated light islands.", "Preserve the current route-level rule: prefer shared tokens over new raw theme colors in Svelte files."]
last_handoff_id = "HANDOFF-20260402T163915"
updated_at = "2026-04-04T02:57:33.642Z"
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
