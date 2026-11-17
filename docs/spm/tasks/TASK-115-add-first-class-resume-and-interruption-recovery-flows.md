+++
doc_kind = "task"
id = "TASK-115"
title = "Add first-class resume and interruption-recovery flows"
summary = "Build explicit resume workflows that summarize what changed since a prior checkpoint, handoff, commit, or time window."
status = "done"
spec_ids = ["SPEC-057"]
depends_on = []
blocked_by = []
priority = 2
created_at = "2026-05-20T22:20:00Z"
completed_at = "2026-05-20T17:23:32.718Z"
tags = []
updated_at = "2026-05-20T17:23:32.718Z"
+++

# Scope

- Add first-class resume flows beyond manual current-state reading.
- Support git- and handoff-aware interruption windows.
- Surface deterministic next steps for resumed work.
- Add focused tests for repos with and without prior handoffs.

# Done Looks Like

- Users and agents can resume broad work from a bounded deterministic surface.
- Resume flows work even when git or handoff context is partial.
- Existing current-state and handoff documents remain foundational.
- Tests cover interruption recovery branches.
