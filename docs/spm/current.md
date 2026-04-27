+++
doc_kind = "current-state"
id = "CURRENT"
title = "Current Project State"
summary = "TASK-091 is in review after adding a direct agent snippet command that returns the bounded external AGENTS guidance without scraping larger adoption outputs."
focus = "Add a first-class bounded AGENTS snippet command"
active_spec_ids = ["SPEC-035"]
active_task_ids = ["TASK-091"]
blocked_task_ids = []
next_action_hints = ["Review TASK-091 and confirm agent snippet output stays aligned with the shared adoption guidance.", "Verify the new command remains a thin read-only wrapper over the shared service layer.", "If review passes, close SPEC-035 and choose the next product slice."]
last_handoff_id = "HANDOFF-20260402T163915"
updated_at = "2026-04-27T01:45:18.962Z"
tags = ["v1", "self-hosting", "spec-workflow", "context"]
+++

# Current State

This file is the explicit checkpoint for interrupted work. It should answer:

- what the project is trying to do right now
- which specs and tasks are active
- what should happen next
- what is blocked
- where a future human or agent should resume

## Narrative

The `0.2.0` memory and context work is complete, and SPEC-034 has now pushed that adoption story further: upgraded and newly-adopted agents get one shared workflow loop plus a bounded external `AGENTS.md` snippet that points them toward `spm status`, `docs/spm/current.md`, and `spm memory pack` only when it is warranted. TASK-090 is now at review after wiring that snippet through the same deterministic adoption guidance used by `doctor`, `init`, generated migration artifacts, and `spm agent brief`.

## Notes

- Prompt-return mode remains first-class to avoid unnecessary nested agent spawning.
- New substantive specs should follow the explicit draft -> user iteration -> review -> fix loop.
- The repo should increasingly manage itself through `docs/spm/` and `spm` commands instead of ad hoc memory.
- Adoption improvements should extend Codex/Claude behavior with repo-local workflow guidance, not reimplement model-native context handling.
- Managed document creation now relies on a shared repository lock; future create flows should preserve that invariant instead of adding unsynchronized ID allocation paths.
- Changed-item reporting now has nine coupled invariants: identity-plus-path human formatting, one normalized `changeHint` for compact summaries, one compact raw `statusCode` for structured consumers, a managed-first presentation order limited to human status-style summaries, an explicit omitted-count signal when human-visible summary slices are truncated, shared helper logic so the truncation note wording stays aligned across status-style outputs, an explicit resume context-pack note when additional changed files were moved into offloaded detail, a matching `nextInspectIds` trail for the highest-value omitted changed files, and typed `nextInspect` entries so callers can distinguish doc refs from changed-file paths.
