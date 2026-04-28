+++
doc_kind = "task"
id = "TASK-107"
title = "Add structured Nexus coexistence guidance to adoption outputs"
summary = "Expose the bounded Nexus coexistence contract as shared structured adoption guidance for doctor and agent brief surfaces."
status = "done"
spec_ids = ["SPEC-051"]
depends_on = []
blocked_by = []
priority = 2
created_at = "2026-04-28T16:40:00Z"
tags = []
updated_at = "2026-04-28T17:00:00Z"
+++

# Scope

- Add a structured Nexus coexistence field to shared adoption guidance.
- Flow the field into `spm agent brief --json`.
- Render migration and agent Nexus coexistence sections from the shared field.
- Extend focused tests for both structured and human-facing outputs.

# Done Looks Like

- The expected behavior is implemented and verified.
- Shared adoption guidance exposes structured Nexus coexistence guidance.
- Agent brief JSON includes the same coexistence guidance without prose scraping.
- Human-facing migration and brief outputs render the same coexistence guidance from one source.
- Existing Nexus coexistence wording and order are preserved.
