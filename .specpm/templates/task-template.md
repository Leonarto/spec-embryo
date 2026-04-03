+++
doc_kind = "task"
id = "TASK-001"
title = "Implement the Bun CLI and file-backed repository layer"
status = "in_progress"
summary = "Create the runnable CLI entrypoint, document parser, storage helpers, and core commands."
spec_ids = ["SPEC-001"]
depends_on = []
blocked_by = []
priority = 1
owner_role = "builder"
tags = ["v1", "cli"]
updated_at = "2026-04-02T00:00:00Z"
+++

# Scope

Ship the initial commands and the document model so the project is already useful with local files alone.

# Done Looks Like

- `init`, `status`, `resume`, `handoff`, `spec list`, and `task list` exist
- repo memory files are created and validated deterministically
- the CLI can help a human or agent resume after interruption
