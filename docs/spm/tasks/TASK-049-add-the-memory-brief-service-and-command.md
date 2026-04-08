+++
doc_kind = "task"
id = "TASK-049"
title = "Add the memory brief service and command"
summary = "Build compact implementation, review, or migration-oriented memory briefs for a spec, task, doc id, or topic query without dumping large document bodies by default."
status = "done"
spec_ids = ["SPEC-013"]
depends_on = ["TASK-046"]
blocked_by = []
priority = 1
owner_role = "builder"
created_at = "2026-04-08T14:41:16.074Z"
completed_at = "2026-04-08T16:23:26.386Z"
tags = ["memory", "brief", "cli"]
updated_at = "2026-04-08T16:23:26.386Z"
+++

# Scope

- Build a shared brief-construction service that composes compact working context from current state, indexed docs, and link neighborhoods.
- Add `spm memory brief` so humans and agents can request context by spec, task, doc ID, or topic query.
- Keep briefs compact by default and avoid dumping large doc bodies unless explicitly needed.
- Support structured JSON output and a small set of retrieval-oriented controls such as neighbors, current state, and handoff inclusion.

# Done Looks Like

- `spm memory brief` can produce useful compact context for at least spec, task, and text-driven entry modes.
- The brief output is smaller and more action-oriented than raw doc dumps.
- JSON output is available for agent consumption.
- Tests cover brief construction, and the linked project memory stays consistent.
