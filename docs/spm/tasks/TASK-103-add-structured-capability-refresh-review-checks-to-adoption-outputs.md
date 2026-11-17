+++
doc_kind = "task"
id = "TASK-103"
title = "Add structured capability-refresh review checks to adoption outputs"
summary = "Expose the key post-upgrade review checks as shared structured guidance in adoption outputs and agent brief JSON."
status = "done"
spec_ids = ["SPEC-047"]
depends_on = []
blocked_by = []
priority = 2
created_at = "2026-04-28T15:06:31.548Z"
tags = []
updated_at = "2026-04-28T15:20:00Z"
+++

# Scope

- Add a structured capability-refresh review-check field to shared adoption guidance while keeping the existing text actions and typed command suggestions.
- Flow that field into `spm agent brief --json`.
- Update human-facing adoption renderers and the short agent brief so they show the same review checklist from the shared field.
- Extend tests to cover both the structured field and the rendered capability-refresh review sections.

# Done Looks Like

- The expected behavior is implemented and verified.
- Adoption guidance exposes structured capability-refresh review checks as shared data.
- Agent brief JSON includes the same capability-refresh review checks without prose scraping.
- Human-facing adoption outputs and the short agent brief render the same capability-refresh review checklist from one source.
- The linked project memory stays consistent.
