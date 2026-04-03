+++
doc_kind = "task"
id = "TASK-001"
title = "Implement the Bun CLI and file-backed repository layer"
summary = "Create the runnable CLI entrypoint, document parser, storage helpers, and core commands."
status = "done"
spec_ids = ["SPEC-001"]
depends_on = []
blocked_by = []
priority = 1
owner_role = "builder"
tags = ["v1", "cli"]
updated_at = "2026-04-03T01:13:35.861Z"
+++

# Scope

Ship the initial commands and the document model so the project is already useful with local files alone.

# Done Looks Like

- `init`, `status`, `resume`, `handoff`, `spec list`, and `task list` exist
- repo memory files are created and validated deterministically
- the CLI can help a human or agent resume after interruption
