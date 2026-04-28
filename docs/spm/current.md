+++
doc_kind = "current-state"
id = "CURRENT"
title = "Current Project State"
summary = "SPEC-053 is active to promote Nexus setup commands into structured adoption data for JSON-first callers."
focus = "Add typed Nexus setup command suggestions across shared adoption guidance and agent brief JSON."
active_spec_ids = ["SPEC-053"]
active_task_ids = ["TASK-109"]
blocked_task_ids = []
next_action_hints = ["Expose bounded Nexus setup commands as shared data instead of leaving them embedded only in prose sections.", "Flow the same Nexus setup commands into `spm agent brief --json` and the short human brief.", "Keep the setup flow wording intact while adding typed command suggestions for JSON-first callers."]
last_handoff_id = "HANDOFF-20260402T163915"
updated_at = "2026-04-28T17:30:00Z"
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

`SPEC-053` is now active. Nexus setup flow steps already live in shared structured adoption data, but JSON-first callers still need to infer the actual bounded commands from prose sections. This slice promotes those setup commands into the shared contract so doctor JSON, the short agent brief, and the human adoption artifacts all stay aligned on one typed Nexus enablement surface.

## Notes

- Prompt-return mode remains first-class to avoid unnecessary nested agent spawning.
- New substantive specs should follow the explicit draft -> user iteration -> review -> fix loop.
- The repo should increasingly manage itself through `docs/spm/` and `spm` commands instead of ad hoc memory.
- Adoption improvements should extend Codex/Claude behavior with repo-local workflow guidance, not reimplement model-native context handling.
- Managed document creation now relies on a shared repository lock; future create flows should preserve that invariant instead of adding unsynchronized ID allocation paths.
- Changed-item reporting now has nine coupled invariants: identity-plus-path human formatting, one normalized `changeHint` for compact summaries, one compact raw `statusCode` for structured consumers, a managed-first presentation order limited to human status-style summaries, an explicit omitted-count signal when human-visible summary slices are truncated, shared helper logic so the truncation note wording stays aligned across status-style outputs, an explicit resume context-pack note when additional changed files were moved into offloaded detail, a matching `nextInspectIds` trail for the highest-value omitted changed files, and typed `nextInspect` entries so callers can distinguish doc refs from changed-file paths.
