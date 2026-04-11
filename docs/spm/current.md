+++
doc_kind = "current-state"
id = "CURRENT"
title = "Current Project State"
summary = "SPEC-018 and TASK-065 are done. spm now has a first-class nexus setup command that previews or applies bounded Nexus config, AGENTS guidance, local artifact ignore rules, and adoption artifact refreshes so external-project agents can ask the human once instead of manually chaining doctor, init, config, and AGENTS edits."
focus = "Choose the next slice after one-step Nexus setup orchestration."
active_spec_ids = []
active_task_ids = []
blocked_task_ids = []
next_action_hints = ["Use spm nexus setup in external repos to preview bounded Nexus activation before applying it.", "Consider a later runtime Nexus integration such as review prep or resume enrichment if the setup flow proves useful."]
last_handoff_id = "HANDOFF-20260402T163915"
updated_at = "2026-04-11T20:14:03.718Z"
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

The repo is now recursive enough to carry its own managed roadmap and core workflows. The CLI can mutate status, create new spec/task docs with deterministic IDs and back-links, and now serializes concurrent create flows so task/spec IDs no longer collide under parallel work. The local visual server still exposes the four-view workspace, and spec detail pages can now turn answered open questions into durable file-backed decisions instead of leaving them trapped in chat history.

## Notes

- Prompt-return mode remains first-class to avoid unnecessary nested agent spawning.
- New substantive specs should follow the explicit draft -> user iteration -> review -> fix loop.
- The repo should increasingly manage itself through `docs/spm/` and `spm` commands instead of ad hoc memory.
- Managed document creation now relies on a shared repository lock; future create flows should preserve that invariant instead of adding unsynchronized ID allocation paths.
- The local visual server should stay mostly read-only apart from narrow deterministic mutation flows such as answering spec open questions from the detail view.
