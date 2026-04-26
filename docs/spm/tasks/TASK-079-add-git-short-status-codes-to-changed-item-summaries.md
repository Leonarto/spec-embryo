+++
doc_kind = "task"
id = "TASK-079"
title = "Add git short-status codes to changed-item summaries"
summary = "Parse and surface compact git change-type hints across status-style changed-item summaries."
status = "done"
spec_ids = ["SPEC-025"]
depends_on = []
blocked_by = []
priority = 2
owner_role = "builder"
created_at = "2026-04-26T02:24:31.729Z"
completed_at = "2026-04-26T02:40:59.887Z"
tags = ["git", "status", "ux"]
updated_at = "2026-04-26T02:40:59.887Z"
+++

# Scope

- Extend changed-item derivation so each summary carries one normalized git change hint.
- Update shared human-readable formatting so managed and unmanaged changed items both surface that hint.
- Reuse the same formatted shape in `spm status`, deterministic resume text, and compact context-pack summaries.
- Add regression tests for modified, untracked, and renamed entries.

# Done Looks Like

- `ChangedItemSummary` includes a compact git change hint derived from short-status output.
- Human-facing changed-item summaries include that hint consistently across the existing text surfaces.
- Tests prove the hint for tracked edits, untracked files, and rename records.
- The linked project memory stays consistent.
