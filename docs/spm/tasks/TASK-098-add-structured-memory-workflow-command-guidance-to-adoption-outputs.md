+++
doc_kind = "task"
id = "TASK-098"
title = "Add structured memory-workflow command guidance to adoption outputs"
summary = "Expose the memory workflow command set in shared adoption guidance and agent brief JSON instead of leaving it as prose-only hints."
status = "done"
spec_ids = ["SPEC-042"]
depends_on = []
blocked_by = []
priority = 2
created_at = "2026-04-27T21:07:42.235Z"
tags = []
updated_at = "2026-04-27T22:05:00.000Z"
+++

# Scope

- Add a typed memory-workflow command field to shared adoption guidance while keeping the existing prose workflow hints.
- Flow that field into `spm agent brief --json`.
- Update the adoption and agent-brief renderers so the shared memory command list is visible in human output too.
- Extend tests to cover the structured field and the rendered memory command section.

# Done Looks Like

- Adoption guidance exposes scoped memory workflow commands as shared structured data.
- Agent brief JSON includes the scoped memory command list without prose scraping.
- Human-facing adoption outputs and the short agent brief show the same command/reason pairs from one shared source.
- The expected behavior is implemented and verified.
- The linked project memory stays consistent.
