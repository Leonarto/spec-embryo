+++
doc_kind = "current-state"
id = "CURRENT"
title = "Current Project State"
summary = "AGENTS budgets now derive from project-standard context ratios in .specpm/config.toml, defaulting to a 400000-token GPT-5/Codex context assumption."
focus = "Choose the next post-budgeting product slice"
active_spec_ids = []
active_task_ids = []
blocked_task_ids = []
next_action_hints = ["Verify external repos behave well with the new AGENTS budget config.", "Decide whether AGENTS budget editing should get dedicated CLI flows.", "Consider adding model/profile presets beyond the default GPT-5/Codex-sized context assumption."]
last_handoff_id = "HANDOFF-20260402T163915"
updated_at = "2026-04-04T00:21:03.020Z"
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
