+++
doc_kind = "task"
id = "TASK-131"
title = "Verify revamp accessibility performance and packaging"
summary = "Complete browser, performance, coverage and installed-package checks; resolve review findings."
status = "todo"
spec_ids = ["SPEC-062"]
depends_on = ["TASK-129", "TASK-130"]
blocked_by = []
priority = 1
owner_role = "implementation"
created_at = "2026-11-15T18:31:13.896Z"
tags = ["parallel-implementation"]
updated_at = "2026-11-15T18:31:13.896Z"
+++

# Scope

Implement P7 of SPEC-062, including the contracts, edge cases and acceptance criteria defined there. Preserve the checkpointed baseline and keep changes confined to this slice.

# Execution and review

- Implementation: Sol 6.1 High (`ui_implementation`).
- Technical decisions and UX review: Astra High. Escalate uncovered design decisions before implementing them.
- Run relevant automated checks and capture evidence required by the spec.
- Move to `review` when implementation and evidence are ready; resolve findings before `done`.
- The orchestrator commits the reviewed slice before its dependent slice starts.
- Update relevant local instructions with the agents-md-maintainer skill.

# Verification record

Pending implementation. No acceptance criterion is claimed complete yet.


# Integration acceptance record

At final freeze, map every SPEC-062 AC01–AC15 to concrete evidence and report passed/failed/not-run separately. Earlier slice results certify their frozen versions only. Reuse valid evidence; rerun affected flows and final packaging rather than duplicating every historical matrix. Include the scope of Bun coverage and the separate Svelte/browser flow matrix, actual contrast states, keyboard plus simple/no-JS fallback, question mutation/dirty conflict, responsive drawer history/focus, large graph equivalence and serial HTTP/performance budgets. Distinguish warm measurements from cold measurements. Record unavailable assistive-technology environments explicitly, never count axe as a screen-reader test. Perform a fresh external-project prepared-package runtime smoke against the final packaged assets. Review findings must be fixed and committed before closure.
