+++
doc_kind = "task"
id = "TASK-104"
title = "Add structured partial-adoption checks to adoption outputs"
summary = "Expose the partial-adoption cleanup checklist as shared data across doctor and agent guidance surfaces."
status = "review"
spec_ids = ["SPEC-048"]
depends_on = []
blocked_by = []
priority = 2
created_at = "2026-04-28T15:30:00Z"
tags = []
updated_at = "2026-04-28T15:29:38.531Z"
+++

# Scope

- Add a structured partial-adoption checklist field to shared adoption guidance.
- Flow the field into `spm agent brief --json`.
- Render migration and direct-agent partial-adoption sections from the shared field.
- Extend focused tests for partial and fully adopted paths.

# Done Looks Like

- The expected behavior is implemented and verified.
- Shared adoption guidance exposes structured partial-adoption checks.
- Agent brief JSON includes the same partial-adoption checklist without prose scraping.
- Human-facing migration and brief outputs render the same checklist from one source.
- Fully adopted repos keep the field empty and avoid a partial-adoption section.
