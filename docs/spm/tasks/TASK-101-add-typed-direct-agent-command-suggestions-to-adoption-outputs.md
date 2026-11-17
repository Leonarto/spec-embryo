+++
doc_kind = "task"
id = "TASK-101"
title = "Add typed direct-agent command suggestions to adoption outputs"
summary = "Expose direct agent brief and snippet discoverability as shared command/reason data in adoption guidance and agent brief JSON."
status = "done"
spec_ids = ["SPEC-045"]
depends_on = []
blocked_by = []
priority = 2
created_at = "2026-04-28T14:30:04.467Z"
completed_at = "2026-04-28T14:47:19.418Z"
tags = []
updated_at = "2026-04-28T14:47:19.418Z"
+++

# Scope

- Add a typed direct-agent suggestion field to shared adoption guidance while keeping the existing text lines.
- Flow that field into `spm agent brief --json`.
- Update human-facing adoption renderers and the short agent brief so they show the same direct-agent command/reason pairs from the shared field.
- Extend tests to cover both the structured field and the rendered direct-agent suggestion sections.

# Done Looks Like

- The expected behavior is implemented and verified.
- Adoption guidance exposes typed direct-agent command suggestions as shared structured data.
- Agent brief JSON includes the same direct-agent command suggestions without prose scraping.
- Human-facing adoption outputs and the short agent brief render the same direct-agent suggestions from one source.
- The linked project memory stays consistent.
