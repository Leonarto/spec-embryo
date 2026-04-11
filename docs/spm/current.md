+++
doc_kind = "current-state"
id = "CURRENT"
title = "Current Project State"
summary = "SPEC-017 plus TASK-064 are done, including review fixes for invalid Nexus AGENTS modes and scoped AGENTS validation. Spec Embryo now has Nexus guardrails in product code and this repo is explicitly Nexus-enabled with a local GitNexus index, root AGENTS coexistence contract, and local Nexus/Claude artifacts ignored."
focus = "Choose whether the next slice should add runtime Nexus-powered review or resume flows, or return to memory and adoption work."
active_spec_ids = []
active_task_ids = []
blocked_task_ids = []
next_action_hints = ["Use GitNexus for code-impact checks while keeping spm as the planning source of truth.", "Consider a follow-up spec for review-prepare or resume-time Nexus integration if the manual workflow proves useful."]
last_handoff_id = "HANDOFF-20260402T163915"
updated_at = "2026-04-11T03:29:46.000Z"
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
