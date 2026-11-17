+++
doc_kind = "task"
id = "TASK-084"
title = "Share truncation-note helpers across text surfaces"
summary = "Move omitted-count math and note wording into shared deterministic helpers used by status and deterministic backend text output."
status = "done"
spec_ids = ["SPEC-030"]
depends_on = []
blocked_by = []
priority = 2
owner_role = "builder"
created_at = "2026-04-26T04:15:00.000Z"
completed_at = "2026-04-26T04:45:00.000Z"
tags = ["git", "status", "ux", "deterministic"]
updated_at = "2026-04-26T04:45:00.000Z"
+++

# Scope

- Add shared deterministic helpers for visible-slice plus omitted-count behavior.
- Route changed-item and raw git truncation note formatting through those helpers.
- Keep output wording and limits unchanged.
- Add focused regressions for helper behavior and shared text-surface usage.

# Done Looks Like

- `spm status` and deterministic backend text no longer open-code truncation-note wording.
- Shared helpers cover singular, plural, and zero-omission cases.
- Existing human-visible output stays stable.
- The linked project memory stays consistent.
