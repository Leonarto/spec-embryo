+++
doc_kind = "task"
id = "TASK-136"
title = "Optimize shared graph analysis with exact compatibility"
summary = "Extract the independent graph optimization checkpoint from TASK-130, preserving all public DTOs and legacy results while removing recursion and repeated scans."
status = "in_progress"
spec_ids = ["SPEC-062"]
depends_on = ["TASK-126"]
blocked_by = []
priority = 1
owner_role = "implementation"
created_at = "2026-11-15T20:58:20.291Z"
tags = ["parallel-implementation", "performance"]
updated_at = "2026-11-15T21:05:29.593Z"
+++

# Deterministic graph checkpoint before TASK-130

Decision: approve extracting the existing graph-optimization portion of130 into one independently reviewed checkpoint after135 is approved and committed. It depends on126; it does not depend on127/128. Existing status, resume, dashboard and Timeline consumers immediately benefit, so this is not speculative code. Root creates/updates the managed task and dependencies before activating the free Sol.

## Exclusive ownership and unchanged contract

Sol owns `src/engine.ts`, `src/services/dashboard.ts`, focused graph/compatibility tests and a deterministic benchmark script/report outside the UI-owned verification files. Prefer a new graph test file plus a pinned test-only legacy oracle; touch existing engine/dashboard tests only when necessary. Coordinate nearest AGENTS maintenance through root if another slice owns those files. No `workspace.ts`, `workspace-query.ts`, resource validators, domain schemas, routes, components, app.css or inspector changes. No new dependencies, endpoints, DTO fields, caches across requests, exports solely for hypothetical consumers, or scheduler semantics.

Keep existing function signatures and serialized outputs identical. Reuse the already public `buildTaskAnalysisIndex` internally: one index per deriveStatusSnapshot invocation and one per buildDashboardData card projection, passed to existing summarizeTaskNode/toTaskCard calls. Do not introduce optional public plumbing solely to share these two allocations; both remain linear and the public contract stays stable.

## Included implementation

Apply the exact-compatibility algorithms already specified in the TASK-130 decision note: iterative critical-path DFS with immutable linked path records and final-only materialization; iterative placement retaining cache-before-cycle and ancestor overwrite; cursor-based reachability; per-projection adjacency/maps/sets for membership and group lookup. Compute transitive closure only for the selected task. Retain source order, dependency order, strict greater-than ties, missing-reference behavior, done/cancelled treatment, active/all filtering, effort formula, archived/window rules, output ordering and cycle fallbacks including repeated IDs.

Maps must preserve the actual baseline collision rule at each site: task Map lookups are last-ID-wins, whereas existing `specs.find(...)` group labels are first matching spec, so build that lookup with first-write-wins. Preserve duplicate direct dependency/dependent arrays and cyclic self-reachability; replacing membership checks with sets must not rewrite their output arrays. Keep inputs immutable. Do not add diagnostics yet or alter nonfinite results as a hidden optimization; diagnostic metadata and explicit unavailable placement belong to130's later reviewed contract change.

## Independent gate

Pin the pre-change committed engine/dashboard implementation as a test-only oracle before editing. Compare entire relevant snapshot/projection outputs, including IDs with repeats, object/card fields, placement, row/group order, trace arrays and duplicate collision behavior. Use deterministic generated small DAGs, cycles/self-loops, missing and repeated references, duplicate IDs/spec IDs, ties, closed statuses, archive/window selections and no/unknown/valid selected task. Verify inputs remain unchanged. Never update expected legacy output to match a faster algorithm.

Run10k-chain and10k-task/2k-spec/30k-edge fixtures without stack overflow; measure status, Timeline projection with/without selected trace, and legacy dashboard facade separately. Report5 warmups+20 samples, median/p95, fixture definition, machine and exact commit; distinguish loading/agents IO from pure computation. Show the old quadratic/recursive work has been removed through algorithm inspection plus measured results. There is no new invented Timeline HTTP gate here: use130's final budgets later, and do not claim rendering, accessibility, cold-cache or final HTTP acceptance from this checkpoint. Run affected engine/dashboard/workspace/harness regressions because status is shared with resume, then required coverage/AGENTS/diff checks. Freeze a manifest for Astra review and commit fixes before the next slice.

## Remaining130 and sequence

130 must depend on this approved commit AND128. It consumes these implementations, adds bounded diagnostics/nonfinite handling through explicit DTO/validator changes, and implements Timeline rendering, simple-mode paging, inspector integration and volume interaction evidence.127/128 can proceed independently against unchanged interfaces; concurrent full-tree tests must identify the tested commit/manifest honestly.129/130 parallel boundaries from the existing note remain valid, and131 still waits for both final reviews. This checkpoint marks only its own optimization work complete, never130 or the final performance ACs.


# Verification record

Pending implementation. Activate after TASK-135 is reviewed and committed; its dependency remains TASK-126 because resource scheduling is not a functional dependency.
