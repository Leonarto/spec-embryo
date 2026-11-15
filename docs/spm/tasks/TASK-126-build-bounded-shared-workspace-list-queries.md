+++
doc_kind = "task"
id = "TASK-126"
title = "Build bounded shared workspace list queries"
summary = "Implement typed queries, stable sorting, pagination, archive semantics and route-specific payloads."
status = "todo"
spec_ids = ["SPEC-062"]
depends_on = ["TASK-125"]
blocked_by = []
priority = 1
owner_role = "implementation"
created_at = "2026-11-15T18:31:13.527Z"
tags = ["parallel-implementation"]
updated_at = "2026-11-15T18:31:13.527Z"
+++

# Scope

Implement P2 of SPEC-062, including the contracts, edge cases and acceptance criteria defined there. Preserve the checkpointed baseline and keep changes confined to this slice.

# Execution and review

- Implementation: Sol 6.1 High (`ui_implementation`).
- Technical decisions and UX review: Astra High. Escalate uncovered design decisions before implementing them.
- Run relevant automated checks and capture evidence required by the spec.
- Move to `review` when implementation and evidence are ready; resolve findings before `done`.
- The orchestrator commits the reviewed slice before its dependent slice starts.
- Update relevant local instructions with the agents-md-maintainer skill.

# Verification record

Pending implementation. No acceptance criterion is claimed complete yet.

# Astra technical decisions

- List queries project canonical ProjectContext with an O(V+E) task index; do not call the dashboard, status snapshot or critical-path derivation for table requests.
- Reuse per-request maps for IDs, direct dependents and spec-to-task links; no global cache.
- A shared engine index may be added with an optional precomputed argument to existing summaries; preserve legacy callers and exact semantics.
- Downstream count means unique direct dependent tasks, even when dependsOn contains duplicates. Only done dependencies satisfy the existing gate.
- Compare indexed and legacy results on small generated fixtures, missing references, cycles, cancelled tasks and duplicate dependencies. Defer critical-path algorithm changes to TASK-130.

# Controlled refresh requirement

Astra moved in-place refresh here from TASK-125 after reproducing SvelteKit native-navigation fallback on data-load failure. Implement it over the shared route DTOs with explicit request ownership: successful refresh updates data, failed refresh preserves rows, scroll and focus and shows a retryable stale-data notice. Test aborted/failed responses and out-of-order requests. Do not rely on catching invalidateAll to preserve state.
