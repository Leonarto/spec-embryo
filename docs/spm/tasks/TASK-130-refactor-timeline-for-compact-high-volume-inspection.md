+++
doc_kind = "task"
id = "TASK-130"
title = "Refactor timeline for compact high-volume inspection"
summary = "Preserve dependency tracing while bounding rendering and integrating the inspector."
status = "todo"
spec_ids = ["SPEC-062"]
depends_on = ["TASK-128", "TASK-136"]
blocked_by = []
priority = 1
owner_role = "implementation"
created_at = "2026-11-15T18:31:13.794Z"
tags = ["parallel-implementation"]
updated_at = "2026-11-15T18:31:13.794Z"
+++

# Scope

Implement P6 of SPEC-062, including the contracts, edge cases and acceptance criteria defined there. Preserve the checkpointed baseline and keep changes confined to this slice.

# Execution and review

- Implementation: Sol 6.1 High (`ui_implementation`).
- Technical decisions and UX review: Astra High. Escalate uncovered design decisions before implementing them.
- Run relevant automated checks and capture evidence required by the spec.
- Move to `review` when implementation and evidence are ready; resolve findings before `done`.
- The orchestrator commits the reviewed slice before its dependent slice starts.
- Update relevant local instructions with the agents-md-maintainer skill.

# Verification record

Pending implementation. No acceptance criterion is claimed complete yet.


# Detailed Astra implementation decisions

# TASK-130 — Astra graph, volume and parallel-boundary decisions

No scheduler/calendar model, new dependency or semantic “cleanup”. Current input order, effort formula, filtered graph, archive/window rules and output order are authoritative. Implement after128 shared inspector contract is frozen; possible parallel129 execution is conditional below.

## Shared graph optimization with exact compatibility

Current risks are concrete: engine.computeCriticalPath recursively clones paths/trails; dashboard.buildTimeline recursively clones trails; reachability uses queue.shift, and per-row includes/spec.find produce repeated scans. Replace these shared implementations, not their meaning.

- Critical path: explicit DFS frames + active set and memoization; cached result checked before active-cycle handling, as today. Cache immutable linked path records {task,previous,length}, materialize ONLY the final chosen path. This removes quadratic path-array copies on a10k chain. Retain source task iteration, declared dependency order, missing/done/cancelled skips, strict greater-than replacement (first equal-length winner), last-ID-wins lookup and cycle fallback `[task]`. Immutable path nodes may repeat an ID for the current cycle behavior but must never form pointer cycles. Do not substitute a topological/SCC schedule that changes cyclic outputs.
- Timeline placement: explicit frames preserving the existing cache-before-cycle check and cycle fallback start0/end=effort; preserve the later ancestor overwrite of that cache entry. Missing dependencies in the filtered task map contribute nothing. Cancelled tasks remain omitted from rendered timeline items but may still contribute placement when they are dependencies present in the existing map. Active mode excludes done/cancelled first. Keep effort and start/end/priority/ID ordering exact; explain cancelled omission in mode help rather than changing it.
- Reachability: adjacency/reverse maps once per projection, queue with cursor rather than shift, visited sets and constant-time membership sets for row/group highlights. Preserve current output array order, including duplicate direct dependency/dependent IDs and current cyclic self-reachability; only downstream task summary count remains unique as established126. Do not compute transitive closure for every task: only the selected task needs it. Group lookup uses a spec map, retaining source group order, primary-spec rule and selected empty groups.
- deriveStatusSnapshot must reuse a single TaskAnalysisIndex for all summaries instead of repeatedly scanning the whole map; preserve its public/default behavior and existing defaults. This removes the remaining quadratic Overview/resume path while the critical-path implementation is changed. Keep inputs immutable and no global cache.
- Add bounded diagnostic metadata, not new scheduling rules: missing references and detected DFS back-edges, deterministic first100 samples plus omitted counts/hasCycles. A back-edge count is NOT the count of all cycles. Existing placement remains a deterministic fallback; show that cyclic dependency timing is not a reliable schedule. Nonfinite derived units must produce an explicit unavailable/invalid placement diagnostic, never NaN/Infinity CSS or silently invented dates.

Before accepting optimizations, run a baseline-function oracle extracted from the committed code on small generated DAGs/cycles/missing/duplicate refs/statuses/ties; compare critical-path IDs (including repeats), timeline starts/ends/order/groups and trace arrays exactly. Then10k chain and10k/2k/30k-edge fixtures must complete without stack overflow. A new faster algorithm is not accepted merely because fixture assertions were updated to its new output.

## Rendering and accessible fallback

Extract TimelineToolbar/Grid/Ruler/GroupRow using the same projection. One primary scrollport keeps labels/header/bar coordinates aligned. Default fit-to-width relative-unit scale; choose tick step from1/2/5×10^n targeting>=64 CSSpx spacing, hard maximum64 rendered ticks. Render bars with position/width arithmetic, never one DOM cell per unit. No horizontal virtualization or arbitrary dates. Tiny nonzero bars get a small visual hit target without changing reported numeric duration.

Flatten group headers plus currently expanded rows using stable IDs. At<=500 expanded task rows use normal render; above500 use a measured viewport window with overscan8 each side. Row/group heights are fixed per density (32/40 task rows;40 group header), text truncation with focus-accessible full title. Persist collapsed group IDs only for the current project/view session; intersect with actual groups on refresh. Track scroll anchor by first visible ID+offset, not only raw index. Do not remount all groups on selection/refetch.

Never recycle the focused node as another row. Keep a focused row mounted as one pinned extra row outside the visible slice, or deliberately restore focus to its surviving group toggle before collapse/deletion. At the reference1440×900 viewport keep<=80 task rows mounted including overscan/focus retention. This is a measured reference budget, not permission to leave tall viewports blank. On inspector close, scroll the retained opener into the window before focusing; missing opener follows128 fallback.

Use real canonical task/spec links for inspection. Explicit Trace action/bar activation changes selected_task; title/ID Inspect does not conflate it with inspect. Trace toggles/clear preserve open inspector; inspector transitions preserve trace. Reuse128 host without editing its state machine.

SSR/no-JS and simple=1 offer a semantic paginated relative-unit table with ID/title/status/start/end/effort and textual selected relationships. Pages100 default,50/100/200, same filtered projection/order, genuine canonical links and explicit trace links. Put pagination in a shared pure projection/helper; no second domain calculation. Ordinary fallback pager links may opt into simple=1. Do not render10k fallback DOM rows merely because visual enhancement will later hide them. Numeric relation totals come from complete shared data, not mounted rows.

## Budgets and evidence

Use the existing baseline machine/fixtures,5 warmups+20 samples, median/p95, and separate filesystem/projection/serialization/HTTP/render. Keep Tasks/Specs payload<=250KiB/page100 and warmp95<=800ms unaffected. Timeline full DTO has its own actual-byte report; the250KiB list gate does not apply magically to10k graph rows. Report warm projection/HTTP, selected-trace cost, mounted rows/ticks, scroll long tasks and keyboard response; fix failures rather than inferring success from virtual DOM. Coldp95, detailp95<=300ms, grid interactionp95<=50ms, no>100ms scroll long tasks and leak100cycles remain measured gates. No OS-cold result can be claimed from the first convenient request. P7 confirms final combined matrix/package runtime.

## Conditional parallel execution with129

Propose, do not start automatically: after128 and135 commits, SolA owns129 Specs list/components/detail SpecQuestions, question action/conflict guards and its tests; SolB owns130 timeline route/components, engine critical path/status-index optimization, dashboard timeline extraction/new timeline service and its tests. Root owns shared docs. Neither edits app.css. Sol129 owns the shared inspector leave/transition-guard integration needed for dirty questions; it must preserve128's public link/host contract. Sol130 only consumes that interface and must not edit inspector/history/question code. Other shared resource changes require explicit coordination.

Reserve workspace.ts/workspace-query.ts timeline-only additions and resource validator timeline branch to130;129 consumes existing spec row/detail contracts. If129 discovers a necessary shared-file change, serialize that patch through the owner and re-review it—do not let both agents edit the same file opportunistically. Browser remains a single closed-browser handoff lease even with separate fixture servers.

128 is a prerequisite for both.130 implementation and its independent regression checkpoint may run while129 proceeds, but final130 acceptance must also validate integration with129's completed question/inspector behavior; no task is marked done while that required check is pending. Root must update execution dependencies/ledger explicitly if adopting the parallel schedule. TASK131 must wait for BOTH129 and130 to pass their final gates, including combined integration; its AC01–15 matrix, Bun/Svelte coverage scopes, explicit unavailable assistive-technology checks and fresh installed-package runtime remain mandatory. Until root updates the ledger, the existing task chain remains authoritative.


# Graph checkpoint split

TASK-136 now owns the contract-preserving graph optimizations described above and must be approved/committed before this task. TASK-130 consumes that result; it still owns additive diagnostics/nonfinite placement handling, Timeline rendering, fallback paging, inspector integration and final performance evidence. This split does not certify any UI acceptance criterion early.
