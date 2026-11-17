+++
doc_kind = "task"
id = "TASK-124"
title = "Isolate and control optional backend subprocesses"
summary = "Implement run-local artifacts, JSON-safe capture, timeout, cancellation and cleanup with reviewed process semantics."
status = "done"
spec_ids = ["SPEC-061"]
depends_on = ["TASK-123"]
blocked_by = []
priority = 1
owner_role = "implementation"
created_at = "2026-11-15T18:31:13.396Z"
completed_at = "2026-11-15T19:02:28.480Z"
tags = ["parallel-implementation"]
updated_at = "2026-11-15T19:02:28.480Z"
+++

# Scope

Implement P0.3 of SPEC-061, including the contracts, edge cases and acceptance criteria defined there. Preserve the checkpointed baseline and keep changes confined to this slice.

# Execution and review

- Implementation: Sol 6.1 High (`harness_implementation`).
- Technical decisions and UX review: Astra High. Escalate uncovered design decisions before implementing them.
- Run relevant automated checks and capture evidence required by the spec.
- Move to `review` when implementation and evidence are ready; resolve findings before `done`.
- The orchestrator commits the reviewed slice before its dependent slice starts.
- Update relevant local instructions with the agents-md-maintainer skill.

# Verification record

Implemented and approved by independent Astra review after fixing the surviving-descendant case. Independent regression confirms state unknown, retained artifacts and a successful delayed prompt read by the descendant. Independent affected suite: 25 tests and 280 assertions passed; EPIPE behavior verified. Historical full suite before the final fix: 218 passed, 91.73% function and 90.67% line coverage in the Bun scope. AGENTS and diff checks passed. Evidence: `/private/tmp/spm-task124-review.md`, `/private/tmp/spm-harness-slice2-review-fix.log`.
