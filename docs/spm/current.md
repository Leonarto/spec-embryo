+++
doc_kind = "current-state"
id = "CURRENT"
title = "Current Project State"
summary = "Release prep is in progress for 0.3.1 after the latest adoption-guidance and Nexus structured-data improvements."
focus = "Verify publish readiness for 0.3.1 and hand the final publish command to the human."
active_spec_ids = []
active_task_ids = []
blocked_task_ids = []
next_action_hints = ["Finish deterministic release verification for 0.3.1 before publishing.", "Keep the worktree clean and the recorded tool version aligned with the package version.", "After publish, capture the next product slice from the adoption and agent-guidance seam."]
last_handoff_id = "HANDOFF-20260402T163915"
updated_at = "2026-04-28T19:05:00Z"
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

`SPEC-054` is complete. Nexus setup steps, commands, and review checks now live in shared structured adoption data, so doctor JSON, the short agent brief, and the human adoption artifacts all stay aligned on one bounded Nexus enablement contract. The repo is now in release prep for `0.3.1`; once deterministic verification and `bun publish --dry-run --access public` pass, the human can run the final publish command and then choose the next adoption-guidance slice.

## Notes

- Prompt-return mode remains first-class to avoid unnecessary nested agent spawning.
- New substantive specs should follow the explicit draft -> user iteration -> review -> fix loop.
- The repo should increasingly manage itself through `docs/spm/` and `spm` commands instead of ad hoc memory.
- Adoption improvements should extend Codex/Claude behavior with repo-local workflow guidance, not reimplement model-native context handling.
- Managed document creation now relies on a shared repository lock; future create flows should preserve that invariant instead of adding unsynchronized ID allocation paths.
- Changed-item reporting now has nine coupled invariants: identity-plus-path human formatting, one normalized `changeHint` for compact summaries, one compact raw `statusCode` for structured consumers, a managed-first presentation order limited to human status-style summaries, an explicit omitted-count signal when human-visible summary slices are truncated, shared helper logic so the truncation note wording stays aligned across status-style outputs, an explicit resume context-pack note when additional changed files were moved into offloaded detail, a matching `nextInspectIds` trail for the highest-value omitted changed files, and typed `nextInspect` entries so callers can distinguish doc refs from changed-file paths.
