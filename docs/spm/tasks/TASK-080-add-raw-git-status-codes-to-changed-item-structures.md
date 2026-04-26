+++
doc_kind = "task"
id = "TASK-080"
title = "Add raw git status codes to changed-item structures"
summary = "Carry compact raw git short-status codes through changed-item derivation and structured outputs while keeping human summaries unchanged."
status = "done"
spec_ids = ["SPEC-026"]
depends_on = []
blocked_by = []
priority = 2
owner_role = "builder"
created_at = "2026-04-26T02:42:07.049Z"
completed_at = "2026-04-26T02:59:06.308Z"
tags = ["git", "status", "ux"]
updated_at = "2026-04-26T02:59:06.308Z"
+++

# Scope

- Extend changed-item derivation so each item also carries a compact raw git status code.
- Thread that new field through the existing changed-item structures used by status JSON, resume context, and prompt-return bundles.
- Keep human-readable changed-item summaries based on the normalized `changeHint`.
- Add regression tests for raw-code preservation, including mixed tracked states.

# Done Looks Like

- `ChangedItemSummary` includes a compact raw `statusCode` as well as the normalized `changeHint`.
- Structured changed-item consumers can distinguish `MD` from `M` without reparsing raw git output.
- Human-facing changed-item summaries stay unchanged from the previous slice.
- Tests cover modified, renamed, untracked, and mixed tracked status codes.
- The linked project memory stays consistent.
