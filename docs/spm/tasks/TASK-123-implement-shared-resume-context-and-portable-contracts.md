+++
doc_kind = "task"
id = "TASK-123"
title = "Implement shared resume context and portable contracts"
summary = "Correct --since delivery, deterministic provenance, bounded prompt assembly and versioned resume output."
status = "in_progress"
spec_ids = ["SPEC-061"]
depends_on = []
blocked_by = []
priority = 1
owner_role = "implementation"
created_at = "2026-11-15T18:31:13.333Z"
tags = ["parallel-implementation"]
updated_at = "2026-11-15T18:31:37.758Z"
+++

# Scope

Implement P0.1 and P0.2 of SPEC-061, including the contracts, edge cases and acceptance criteria defined there. Preserve the checkpointed baseline and keep changes confined to this slice.

# Execution and review

- Implementation: Sol 6.1 High (`harness_implementation`).
- Technical decisions and UX review: Astra High. Escalate uncovered design decisions before implementing them.
- Run relevant automated checks and capture evidence required by the spec.
- Move to `review` when implementation and evidence are ready; resolve findings before `done`.
- The orchestrator commits the reviewed slice before its dependent slice starts.
- Update relevant local instructions with the agents-md-maintainer skill.

# Verification record

Pending implementation. No acceptance criterion is claimed complete yet.
