+++
doc_kind = "task"
id = "TASK-102"
title = "Add typed capability-refresh command suggestions to adoption outputs"
summary = "Expose version-upgrade refresh commands as shared command/reason data in adoption guidance and agent brief JSON."
status = "done"
spec_ids = ["SPEC-046"]
depends_on = []
blocked_by = []
priority = 2
created_at = "2026-04-28T14:47:58.611Z"
completed_at = "2026-04-28T15:05:49.365Z"
tags = []
updated_at = "2026-04-28T15:05:49.365Z"
+++

# Scope

- Add a typed capability-refresh suggestion field to shared adoption guidance while keeping the existing text actions.
- Flow that field into `spm agent brief --json`.
- Update human-facing adoption renderers and the short agent brief so they show the same capability-refresh command/reason pairs from the shared field.
- Extend tests to cover both the structured field and the rendered capability-refresh suggestion sections.

# Done Looks Like

- The expected behavior is implemented and verified.
- Adoption guidance exposes typed capability-refresh command suggestions as shared structured data.
- Agent brief JSON includes the same capability-refresh command suggestions without prose scraping.
- Human-facing adoption outputs and the short agent brief render the same capability-refresh suggestions from one source.
- The linked project memory stays consistent.
