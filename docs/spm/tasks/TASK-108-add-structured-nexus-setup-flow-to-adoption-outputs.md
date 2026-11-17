+++
doc_kind = "task"
id = "TASK-108"
title = "Add structured Nexus setup flow to adoption outputs"
summary = "Expose the bounded Nexus setup sequence as shared structured adoption guidance for doctor and agent brief surfaces."
status = "done"
spec_ids = ["SPEC-052"]
depends_on = []
blocked_by = []
priority = 2
created_at = "2026-04-28T17:00:00Z"
completed_at = "2026-04-28T17:18:14.221Z"
tags = []
updated_at = "2026-04-28T17:18:14.221Z"
+++

# Scope

- Add a structured Nexus setup flow field to shared adoption guidance.
- Flow the field into `spm agent brief --json`.
- Render migration and agent Nexus setup flow sections from the shared field.
- Extend focused tests for both structured and human-facing outputs.

# Done Looks Like

- The expected behavior is implemented and verified.
- Shared adoption guidance exposes structured Nexus setup flow guidance.
- Agent brief JSON includes the same setup flow without prose scraping.
- Human-facing migration and brief outputs render the same setup flow from one source.
- Existing Nexus setup wording and order are preserved.
