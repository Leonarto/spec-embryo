+++
doc_kind = "task"
id = "TASK-069"
title = "Add memory consolidation and staleness management"
summary = "Separate quick capture from later consolidation so managed memory can dedupe, resolve conflicts, and retire stale context without bloating active prompts."
status = "todo"
spec_ids = ["SPEC-019"]
depends_on = ["TASK-066", "TASK-068"]
blocked_by = []
priority = 2
created_at = "2026-04-25T22:41:55.017Z"
tags = ["memory", "consolidation", "context"]
updated_at = "2026-04-25T22:56:00.000Z"
+++

# Scope

- Add a deterministic path for turning quick-capture memory into durable managed memory.
- Define how consolidation handles deduplication, contradictions, and stale or expired context.
- Keep the flow reviewable in files and git rather than hiding changes in a black-box memory store.
- Align consolidation rules with the scoped-memory model from TASK-068.

# Done Looks Like

- Quick-capture memory does not silently become durable repo truth.
- Consolidation produces stable, inspectable outputs and clear conflict handling.
- Tests cover deduplication, contradiction detection, and staleness behavior.
- Managed memory and docs describe when to capture, consolidate, and retire context.
