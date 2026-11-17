+++
doc_kind = "task"
id = "TASK-144"
title = "Verify multi-repo delivery and prepare GitHub npm release"
summary = "Review combined multi-repo isolation, run bounded package checks, push the reviewed branch and prepare npm release with final publish handoff."
status = "todo"
spec_ids = ["SPEC-063"]
depends_on = ["TASK-142", "TASK-143"]
blocked_by = []
priority = 1
owner_role = "implementation"
created_at = "2026-11-17T14:23:58.589Z"
tags = []
updated_at = "2026-11-17T14:23:58.589Z"
+++

# Scope

After both slices are reviewed/committed, verify combined registered-project reads and writes in disposable roots, Svelte/build/package checks and local AGENTS. Preserve SPEC062 historical failures; do not claim latency acceptance. Then push the reviewed branch to existing GitHub origin and prepare npm release using skills/publish/SKILL.md; final bun publish remains a user 2FA handoff. No actual user repository adoption/global installation is part of this request.
