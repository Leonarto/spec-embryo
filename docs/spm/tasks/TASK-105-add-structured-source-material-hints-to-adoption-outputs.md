+++
doc_kind = "task"
id = "TASK-105"
title = "Add structured source-material hints to adoption outputs"
summary = "Expose initial migration-reading targets as shared structured adoption guidance for doctor and agent brief surfaces."
status = "review"
spec_ids = ["SPEC-049"]
depends_on = []
blocked_by = []
priority = 2
created_at = "2026-04-28T16:00:00Z"
tags = []
updated_at = "2026-04-28T16:11:33.527Z"
+++

# Scope

- Add a structured source-material hint field to shared adoption guidance.
- Flow the field into `spm agent brief --json`.
- Render migration and agent source-material sections from the shared field.
- Extend focused tests for both structured and human-facing outputs.

# Done Looks Like

- The expected behavior is implemented and verified.
- Shared adoption guidance exposes structured source-material hints.
- Agent brief JSON includes the same source-material hints without prose scraping.
- Human-facing migration and brief outputs render the same source-material hints from one source.
- Existing fallback behavior for repos without obvious candidate docs/spec folders is preserved.
