+++
doc_kind = "task"
id = "TASK-128"
title = "Add persistent entity inspector and reusable details"
summary = "Implement inspect URLs, browser history, responsive drawers, focus restoration and shared detail views."
status = "todo"
spec_ids = ["SPEC-062"]
depends_on = ["TASK-127"]
blocked_by = []
priority = 1
owner_role = "implementation"
created_at = "2026-11-15T18:31:13.662Z"
tags = ["parallel-implementation"]
updated_at = "2026-11-15T18:31:13.662Z"
+++

# Scope

Implement P4 of SPEC-062, including the contracts, edge cases and acceptance criteria defined there. Preserve the checkpointed baseline and keep changes confined to this slice.

# Execution and review

- Implementation: Sol 6.1 High (`ui_implementation`).
- Technical decisions and UX review: Astra High. Escalate uncovered design decisions before implementing them.
- Run relevant automated checks and capture evidence required by the spec.
- Move to `review` when implementation and evidence are ready; resolve findings before `done`.
- The orchestrator commits the reviewed slice before its dependent slice starts.
- Update relevant local instructions with the agents-md-maintainer skill.

# Verification record

Pending implementation. No acceptance criterion is claimed complete yet.
