+++
doc_kind = "task"
id = "TASK-068"
title = "Add scoped memory namespaces and access rules"
summary = "Introduce explicit session, repo, and org-style memory scopes so retrieval and writes stay bounded and predictable for long-running agent work."
status = "done"
spec_ids = ["SPEC-019"]
depends_on = ["TASK-066"]
blocked_by = []
priority = 2
created_at = "2026-04-25T22:41:50.697Z"
completed_at = "2026-04-25T23:18:40.124Z"
tags = ["memory", "context", "policy"]
updated_at = "2026-04-25T23:18:40.124Z"
+++

# Scope

- Define deterministic memory scopes for at least session, repo, and org-style guidance.
- Add config, folder-layout, or retrieval-surface changes needed to keep those scopes visible and queryable.
- Make read/write expectations explicit so agents know what can be mutated, promoted, or treated as read-only.
- Keep repo-memory compatibility for existing projects that only use the current managed memory home.

# Done Looks Like

- Scoped memory is represented deterministically and documented clearly.
- Retrieval and context-pack flows can distinguish scoped sources.
- Write-policy expectations are explicit enough to prevent accidental scope drift.
- Existing repo-memory workflows keep working for projects that do not opt into broader scopes.
