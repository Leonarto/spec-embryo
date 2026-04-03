+++
doc_kind = "task"
id = "TASK-010"
title = "Add a CLI launcher for the local UI server"
summary = "Expose the local SvelteKit dashboard through a first-class `spm ui` command with simple host and port controls."
status = "done"
spec_ids = ["SPEC-004"]
depends_on = ["TASK-009"]
blocked_by = []
priority = 1
owner_role = "builder"
tags = ["ui", "cli", "server"]
updated_at = "2026-04-03T00:26:18.290Z"
+++

# Scope

Make the frontend feel like part of the product, not a separate app.

# Done Looks Like

- `spm ui` exists
- it launches the local frontend server in the repo
- it passes host and port through cleanly
- docs explain how to use it
