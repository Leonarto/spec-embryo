+++
doc_kind = "task"
id = "TASK-114"
title = "Add deterministic legacy import and normalization flows"
summary = "Normalize common legacy planning artifacts into canonical SpM docs with explicit mapped, skipped, and review-needed output."
status = "done"
spec_ids = ["SPEC-056"]
depends_on = ["TASK-113"]
blocked_by = ["TASK-113"]
priority = 2
created_at = "2026-05-20T22:19:00Z"
completed_at = "2026-05-20T17:23:27.743Z"
tags = []
updated_at = "2026-05-20T17:23:27.743Z"
+++

# Scope

- Add deterministic import flows for common legacy planning material.
- Normalize imported content into canonical SpM docs and statuses.
- Report mapped, skipped, and review-needed material explicitly.
- Add tests for normalization and unmapped legacy cases.

# Done Looks Like

- Existing repos can migrate planning material with less manual rewriting.
- Import outputs remain auditable and deterministic.
- Unsupported or ambiguous content is surfaced cleanly for review.
- Tests cover normalization quality and failure handling.
