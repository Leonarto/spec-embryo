+++
doc_kind = "task"
id = "TASK-100"
title = "Add structured workflow-loop command guidance to adoption outputs"
summary = "Expose the default workflow loop command set in shared adoption guidance and agent brief JSON instead of leaving it as prose-only steps."
status = "done"
spec_ids = ["SPEC-044"]
depends_on = []
blocked_by = []
priority = 2
created_at = "2026-04-28T13:24:11.535Z"
completed_at = "2026-04-28T14:28:58.247Z"
tags = []
updated_at = "2026-04-28T14:28:58.247Z"
+++

# Scope

- Add a typed workflow-loop command field to shared adoption guidance while keeping the existing prose loop steps.
- Flow that field into `spm agent brief --json`.
- Update human-facing adoption renderers and the short agent brief so they show the same workflow-loop command/reason pairs from the shared field.
- Cover both healthy and missing-current-state branches in tests so the typed command list stays deterministic.

# Done Looks Like

- The expected behavior is implemented and verified.
- Adoption guidance exposes workflow-loop commands as shared structured data.
- Agent brief JSON includes the workflow-loop command list without prose scraping.
- Human-facing adoption outputs and the short agent brief render the same workflow-loop commands from one source.
- The linked project memory stays consistent.
