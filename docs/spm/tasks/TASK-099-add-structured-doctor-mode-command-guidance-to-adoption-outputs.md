+++
doc_kind = "task"
id = "TASK-099"
title = "Add structured doctor-mode command guidance to adoption outputs"
summary = "Expose the doctor mode command set in shared adoption guidance and agent brief JSON instead of leaving it as prose-only hints."
status = "done"
spec_ids = ["SPEC-043"]
depends_on = []
blocked_by = []
priority = 2
created_at = "2026-04-28T00:44:27.739Z"
tags = []
updated_at = "2026-04-28T01:05:00.000Z"
+++

# Scope

- Add a typed doctor-mode command field to shared adoption guidance while keeping the existing prose mode hints.
- Flow that field into `spm agent brief --json`.
- Update human-facing adoption renderers and the short agent brief so they use the shared doctor-mode command list too.
- Extend tests to cover both the structured field and the rendered doctor-mode sections.

# Done Looks Like

- Adoption guidance exposes doctor-mode commands as shared structured data.
- Agent brief JSON includes the doctor-mode command list without prose scraping.
- Human-facing adoption outputs and the short agent brief show the same doctor-mode command/reason pairs from one shared source.
- The expected behavior is implemented and verified.
- The linked project memory stays consistent.
