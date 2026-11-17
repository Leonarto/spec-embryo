+++
doc_kind = "task"
id = "TASK-082"
title = "Add omitted-changes note to human changed-item summaries"
summary = "Append a compact omitted-count note when status-style changed-item summaries truncate the underlying changed-item list."
status = "done"
spec_ids = ["SPEC-028"]
depends_on = []
blocked_by = []
priority = 2
owner_role = "builder"
created_at = "2026-04-26T03:16:38.509Z"
completed_at = "2026-04-26T03:39:28.451Z"
tags = ["git", "status", "ux"]
updated_at = "2026-04-26T03:39:28.451Z"
+++

# Scope

- Add a shared helper for the human-visible changed-item slice plus omitted-count metadata.
- Use it in human status-style changed-item summaries.
- Add regressions for both truncated and non-truncated cases.

# Done Looks Like

- Human changed-item summaries say when additional changed files were omitted.
- No omitted-count note appears when the visible list already contains all changed items.
- Structured changed-item arrays remain unchanged.
- The linked project memory stays consistent.
