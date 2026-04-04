+++
doc_kind = "current-state"
id = "CURRENT"
title = "Current Project State"
summary = "SPEC-012 remains active: TASK-035 is complete, and the next UI slice is to carry the new theme model through shared tokens and workspace surfaces before Mermaid-specific dark-mode polish."
focus = "Refactor shared theme tokens and common surfaces for TASK-036"
active_spec_ids = ["SPEC-012"]
active_task_ids = []
blocked_task_ids = ["TASK-037"]
next_action_hints = ["Start TASK-036 by replacing remaining light-only surface decisions with shared theme tokens.", "Keep the shell, dashboard, task, spec, and timeline surfaces visually intentional in both modes.", "Leave Mermaid-specific dark-mode rendering for TASK-037 after shared surfaces are stable."]
last_handoff_id = "HANDOFF-20260402T163915"
updated_at = "2026-04-04T02:38:26.151Z"
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
