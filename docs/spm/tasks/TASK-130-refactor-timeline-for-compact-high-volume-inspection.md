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


# Exact diagnostic transport contract

# TASK-130 — bounded graph diagnostics and finite-unit transport

Implement only in130.136's legacy oracle and finite/cyclic placement semantics remain authoritative. No scheduler, calendar, SCC repair, cycle enumeration or new dependency.

## Producer and compatibility boundary

Keep DashboardTimelineItem, buildTimelineProjection and buildDashboardData public numeric contracts/output unchanged, including136 oracle tests. Add one shared workspace-timeline projection adapter in src/services (not web parsing) which calls buildTimelineProjection exactly once, diagnoses its input graph once and maps its returned groups into the safe UI DTO. WorkspaceSource provides its existing canonical all-project task-ID set/index; do not reload the repository. The input graph uses the same already scope/window/spec-filtered cards and the same active/all mode filter as legacy placement. Its graph includes cancelled cards in all mode because those may affect dependencies, even though cancelled rows remain omitted. It is not a diagnosis of the entire unfiltered repository.

Since nullable unit fields intentionally change the wire type, change ONLY route=timeline envelopes to schemaVersion2. Other route envelopes remain1; make the generic/union schemaVersion conditional on route and validate the expected route-specific version. Update Timeline SSR data, controlled endpoint, resource validator and fixtures together. No dual ambiguous version interpretation: an old client/new server or reverse rejects that response and retains its prior snapshot; reloading loads matching assets. This local runtime contract upgrade does not change CLI/dashboard facade APIs.130 owns the coordinated timeline DTO/validator patch;129 must not edit those branches concurrently.

Finite results preserve taskCount, group/row order, row fields, numeric values, trace arrays and mode exactly. Diagnostics are additional metadata; they never change dependency satisfaction, progress, effort, selection, group membership or critical path.

## Exact diagnostics object

Required `timeline.diagnostics`:

```ts
type EdgeSample = {
  taskId: string;
  dependencyId: string;
  dependencyIndex: number; // zero-based occurrence in that task's dependsOn
};
type Samples<T> = { count: number; samples: T[]; omittedCount: number };
type TimelineDiagnostics = {
  scope: 'filtered-timeline';
  graphTaskCount: number;
  missingReferences: Samples<EdgeSample>;
  outsideViewReferenceCount: number;
  backEdges: Samples<EdgeSample>;
  hasCycles: boolean;
  invalidPlacements: Samples<{
    taskId: string;
    fields: Array<'effort' | 'start' | 'end'>;
  }>;
  nonFiniteTotal: boolean;
};
```

Each sampled category retains the first100 samples, independently (at most300 entries across the object). Counts are exact nonnegative safe integers, not truncated counts; omittedCount=count−samples.length. Samples contain identifiers only, never task bodies/titles or full paths. Bound here is sample cardinality; do not claim a separate arbitrary-byte budget that is not measured. Empty categories always have count0/samples[]/omittedCount0.

Build a Map from filtered cards with legacy last-ID-wins values and first-insertion traversal order. graphTaskCount is its unique ID count, not rendered row count. Iterate every selected node's dependency array once in declared order. A dependency absent from the all-project ID set contributes one missingReferences occurrence. One present globally but absent from this filtered graph contributes one outsideViewReferenceCount; do not label a filtered-out/archived/completed dependency as missing. Duplicate references count as distinct occurrences and dependencyIndex makes their samples unambiguous. These unavailable edges remain ignored by placement exactly as before.

For present graph edges, use a separate iterative three-color directed DFS, roots in the Map order and dependencies in declared order. A gray-target edge is one back-edge occurrence; duplicate edges to gray targets each count. Black-target edges are not back edges. Sample deterministically in discovery order. hasCycles is exactly backEdges.count>0; the count is NOT the number of unique cycles, SCCs, cyclic tasks or placement fallback events. This separate diagnostic traversal must not reuse legacy cycle-cache shortcuts, which intentionally have different semantics. One pass is O(V+E), with color/frame/maps O(V) and bounded sample storage; never compute transitive closure per row or enumerate cycles.

## Unit-state transport and rendering

Workspace Timeline v2 retains totalUnits but makes it number|null, and adds required `unitsState: 'available'|'unavailable'`. Each workspace row retains effort/start/end as number|null and adds `placementState: 'available'|'unavailable'`. Keep the legacy row type unchanged; derive a separate workspace row/group type with those explicit replacements.

After the single legacy projection, scan its returned groups once. A row is unavailable iff any of its raw effort/start/end values is nonfinite. Replace ONLY the nonfinite fields with null, preserving other finite values; no clamp to zero, synthetic dates, guessed effort or strings such as 'Infinity'. invalidPlacements counts distinct affected task IDs, samples in first encountered group/row order, unioning fields in fixed effort/start/end order for a repeated ID. Keep every row, including unavailable ones. nonFiniteTotal records whether the raw totalUnits itself was nonfinite. If that flag is true OR there is any invalid placement, unitsState=unavailable and totalUnits=null; otherwise state=available and the exact legacy finite totalUnits is retained (empty graph remains1). Do not partially rescale unaffected rows and imply a complete schedule.

No NaN/Infinity may cross the workspace JSON/SSR DTO boundary; validate before serialization, not by relying on JSON.stringify's silent null conversion. Legacy numeric APIs remain legacy; only the web adapter supplies this explicit JSON-safe contract. Current canonical effort is bounded1–8, so unit overflow is defensive input/projection validation, not a reason to alter normal effort or scope.

UI: show a compact warning summary only when a diagnostic count/state warrants it. Label missing references separately from dependencies outside current filters. Back-edge message states that cycles were detected and relative positions use a deterministic fallback; never say 'N cycles'. An expandable list shows bounded samples and omitted counts. Missing targets have no fabricated detail link. Diagnostics do not block inspection/tracing/filtering.

When unitsState=unavailable, suppress the ruler and ALL bars for that projection and show 'Relative placement unavailable' with the same semantic paginated list/inspection controls. Display unavailable numeric cells as 'Unavailable', preserving available finite cell values; no NaN/Infinity CSS, ratio/division, ticks or invented fallback scale. Finite cycles still render their unchanged legacy positions, accompanied by cycle warning. With available units, finite arithmetic remains unchanged; rendering must still guard computed CSS coordinates and adaptive-tick arithmetic against nonfinite intermediates.

## Validator and targeted tests

The Timeline v2 validator checks finite-or-null fields, row placementState consistency, available total finite>=1 / unavailable total null, diagnostic scope and enums, nonnegative safe counts, each sample<=100, omitted equality, valid dependencyIndex and field lists (nonempty, unique, fixed order), and hasCycles equivalence. Check invalidPlacements count versus unique unavailable task IDs and unitsState versus nonFiniteTotal/invalid count in one row scan. Reject inconsistent nulls/missing diagnostics/version mismatch; retain prior resource snapshot on rejection. No O(V²) .includes scans in these checks.

Tests: exact legacy oracle remains untouched; for valid finite workspace results strip only the added metadata/state fields and compare legacy groups/values/selection. DAG, self-cycle, overlapping cycles, repeated gray edges, missing IDs versus scope/window/mode-excluded IDs, deterministic first100 and omitted counts, empty graph and duplicate-ID Map rules.10k chain and30k-edge fixtures must retain linear diagnosis and no recursion. Inject Infinity/NaN in card effort and finite-large overflow to cover unavailable propagation, JSON roundtrip/SSR safety, preserved rows and honest UI fallback; explicitly assert no CSS nonfinite values. Validate malformed v2 payloads/version1 rejection and unchanged Tasks/Specs/Overview validation. Record producer/projection/serialization cost separately; diagnostics do not satisfy final rendering/HTTP/131 gates by themselves.


# Independent diagnostic design review

A second Astra approved this design after checking the current producer, types, validator and runtime. Implementation must validate samples.length == min(count,100), exact omissions, sampled invalid IDs and field unions against rows, and all existing numeric metadata (including priority/counts) before serialization. This is design approval only, not implementation or final performance acceptance.
