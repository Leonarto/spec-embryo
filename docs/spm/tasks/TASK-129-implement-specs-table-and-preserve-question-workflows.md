+++
doc_kind = "task"
id = "TASK-129"
title = "Implement Specs table and preserve question workflows"
summary = "Implement spec table and drawer questions with conflict, dirty-form and refresh protection."
status = "todo"
spec_ids = ["SPEC-062"]
depends_on = ["TASK-128"]
blocked_by = []
priority = 1
owner_role = "implementation"
created_at = "2026-11-15T18:31:13.726Z"
tags = ["parallel-implementation"]
updated_at = "2026-11-15T18:31:13.726Z"
+++

# Scope

Implement P5 of SPEC-062, including the contracts, edge cases and acceptance criteria defined there. Preserve the checkpointed baseline and keep changes confined to this slice.

# Execution and review

- Implementation: Sol 6.1 High (`ui_implementation`).
- Technical decisions and UX review: Astra High. Escalate uncovered design decisions before implementing them.
- Run relevant automated checks and capture evidence required by the spec.
- Move to `review` when implementation and evidence are ready; resolve findings before `done`.
- The orchestrator commits the reviewed slice before its dependent slice starts.
- Update relevant local instructions with the agents-md-maintainer skill.

# Verification record

Pending implementation. No acceptance criterion is claimed complete yet.
