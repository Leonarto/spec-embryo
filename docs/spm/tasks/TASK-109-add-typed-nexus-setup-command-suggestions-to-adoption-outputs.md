+++
doc_kind = "task"
id = "TASK-109"
title = "Add typed Nexus setup command suggestions to adoption outputs"
summary = "Expose bounded Nexus setup commands as shared structured adoption guidance for doctor and agent brief surfaces."
status = "done"
spec_ids = ["SPEC-053"]
depends_on = []
blocked_by = []
priority = 2
created_at = "2026-04-28T17:30:00Z"
completed_at = "2026-04-28T18:24:34.920Z"
tags = []
updated_at = "2026-04-28T18:24:34.920Z"
+++

# Scope

- Add typed Nexus setup command suggestions to shared adoption guidance.
- Flow the field into `spm agent brief --json`.
- Render migration and agent Nexus setup command sections from the shared field.
- Extend focused tests for both structured and human-facing outputs.

# Done Looks Like

- The expected behavior is implemented and verified.
- Shared adoption guidance exposes typed Nexus setup command suggestions.
- Agent brief JSON includes the same setup commands without prose scraping.
- Human-facing migration and brief outputs render the same setup commands from one source.
- Existing bounded setup intent is preserved.
