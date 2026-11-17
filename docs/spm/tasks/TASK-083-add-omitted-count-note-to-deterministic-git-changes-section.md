+++
doc_kind = "task"
id = "TASK-083"
title = "Add omitted-count note to deterministic Git Changes section"
summary = "Append a compact omitted-count note when the deterministic backend truncates raw git short-status lines in the Git Changes section."
status = "done"
spec_ids = ["SPEC-029"]
depends_on = []
blocked_by = []
priority = 2
owner_role = "builder"
created_at = "2026-04-26T03:40:30.740Z"
completed_at = "2026-04-26T04:15:00.000Z"
tags = ["git", "status", "resume"]
updated_at = "2026-04-26T04:15:00.000Z"
+++

# Scope

- Add a small helper or shared pattern for the visible raw git-change slice plus omitted-count metadata.
- Use it in the deterministic backend `Git Changes` section.
- Add regressions for truncated and non-truncated deterministic backend output.

# Done Looks Like

- Deterministic backend output says when additional raw git changes were omitted.
- No omitted-count note appears when the visible raw git-change list is complete.
- Structured outputs remain unchanged.
- The linked project memory stays consistent.
