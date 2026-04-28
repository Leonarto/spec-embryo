+++
doc_kind = "task"
id = "TASK-110"
title = "Add structured Nexus setup review checks to adoption outputs"
summary = "Expose bounded Nexus setup review checks as shared structured adoption guidance for doctor and agent brief surfaces."
status = "done"
spec_ids = ["SPEC-054"]
depends_on = []
blocked_by = []
priority = 2
created_at = "2026-04-28T18:10:00Z"
completed_at = "2026-04-28T19:44:58.375Z"
tags = []
updated_at = "2026-04-28T19:44:58.375Z"
+++

# Scope

- Add structured Nexus setup review checks to shared adoption guidance.
- Flow the field into `spm agent brief --json`.
- Render migration and agent Nexus setup review-check sections from the shared field.
- Extend focused tests for both structured and human-facing outputs.

# Done Looks Like

- The expected behavior is implemented and verified.
- Shared adoption guidance exposes structured Nexus setup review checks.
- Agent brief JSON includes the same review checks without prose scraping.
- Human-facing migration and brief outputs render the same review checks from one source.
- Existing bounded safety and verification intent is preserved.
