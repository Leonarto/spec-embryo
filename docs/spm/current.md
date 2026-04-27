+++
doc_kind = "current-state"
id = "CURRENT"
title = "Current Project State"
summary = "Release prep for 0.3.0 is in progress after the adoption-guidance improvements that shipped since 0.2.0."
focus = "Prepare the 0.3.0 release"
active_spec_ids = []
active_task_ids = []
blocked_task_ids = []
next_action_hints = ["Finish deterministic release verification before handing the publish command to the human.", "Publish 0.3.0 after the dry run is clean and the release-prep commit is in place.", "Resume the next adoption data-structure slice after the release is out."]
last_handoff_id = "HANDOFF-20260402T163915"
updated_at = "2026-04-27T21:05:00.000Z"
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

Release prep for 0.3.0 is underway. The work since 0.2.0 materially improved agent adoption and context orchestration surfaces: `spm agent brief`, `spm agent snippet`, shared adoption guidance across `doctor`/`init`, scoped memory-note workflows, context packs, and stronger changed-item reporting are all in the published release scope. The current tree intentionally pauses before the next adoption data-structure slice so the release can ship from a clean committed checkpoint.

## Notes

- Prompt-return mode remains first-class to avoid unnecessary nested agent spawning.
- New substantive specs should follow the explicit draft -> user iteration -> review -> fix loop.
- The repo should increasingly manage itself through `docs/spm/` and `spm` commands instead of ad hoc memory.
- Adoption improvements should extend Codex/Claude behavior with repo-local workflow guidance, not reimplement model-native context handling.
- Managed document creation now relies on a shared repository lock; future create flows should preserve that invariant instead of adding unsynchronized ID allocation paths.
- Changed-item reporting now has nine coupled invariants: identity-plus-path human formatting, one normalized `changeHint` for compact summaries, one compact raw `statusCode` for structured consumers, a managed-first presentation order limited to human status-style summaries, an explicit omitted-count signal when human-visible summary slices are truncated, shared helper logic so the truncation note wording stays aligned across status-style outputs, an explicit resume context-pack note when additional changed files were moved into offloaded detail, a matching `nextInspectIds` trail for the highest-value omitted changed files, and typed `nextInspect` entries so callers can distinguish doc refs from changed-file paths.
