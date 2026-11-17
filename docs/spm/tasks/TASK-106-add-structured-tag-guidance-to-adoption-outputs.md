+++
doc_kind = "task"
id = "TASK-106"
title = "Add structured tag guidance to adoption outputs"
summary = "Expose tag-handling expectations as shared structured adoption guidance for doctor and agent brief surfaces."
status = "done"
spec_ids = ["SPEC-050"]
depends_on = []
blocked_by = []
priority = 2
created_at = "2026-04-28T16:20:00Z"
tags = []
updated_at = "2026-04-28T16:40:00Z"
+++

# Scope

- Add a structured tag-guidance field to shared adoption guidance.
- Flow the field into `spm agent brief --json`.
- Render migration and agent tag-guidance sections from the shared field.
- Extend focused tests for both structured and human-facing outputs.

# Done Looks Like

- The expected behavior is implemented and verified.
- Shared adoption guidance exposes structured tag guidance.
- Agent brief JSON includes the same tag guidance without prose scraping.
- Human-facing migration and brief outputs render the same tag guidance from one source.
- Existing tag-guidance wording and order are preserved.
