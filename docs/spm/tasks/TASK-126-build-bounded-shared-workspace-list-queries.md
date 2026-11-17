+++
doc_kind = "task"
id = "TASK-126"
title = "Build bounded shared workspace list queries"
summary = "Implement typed queries, stable sorting, pagination, archive semantics and route-specific payloads."
status = "done"
spec_ids = ["SPEC-062"]
depends_on = ["TASK-125"]
blocked_by = []
priority = 1
owner_role = "implementation"
created_at = "2026-11-15T18:31:13.527Z"
completed_at = "2026-11-15T20:41:31.997Z"
tags = ["parallel-implementation"]
updated_at = "2026-11-15T20:41:31.997Z"
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


# Detailed Astra implementation decisions

# TASK-126 — Astra integration decisions

Status: READY FOR IMPLEMENTATION. Scope is the approved P2 shared queries and controlled refresh; product design/UX tables, inspector and timeline virtualization remain later slices. This note closes implementation branches; it does not credit later acceptance criteria.

## Route migration in this slice

- Root layout stops loading DashboardData. It receives shell project/git only (and a generated-at value if displayed). Each page server load calls its route projector; it does not call the JSON endpoint through HTTP.
- Tasks: use the bounded task list service now, while retaining Board presentation until TASK-127. Default 100, permitted sizes 50/100/200. Apply filters and stable global sort, then paginate, then group that page into existing lanes. Send rows once, not both rows and copied lane arrays. Board forces unarchived and does not silently claim to show an archive query. Show range/totalMatching and first/previous/next/last links. Lane counts and empty states explicitly refer to this page. Cancelled still occupies the existing done lane; preserve effective/raw status semantics. TASK-127 adds the table, selection/copy and alternative Board on this foundation.
- Specs: bounded spec query now, using existing cards until TASK-129. Status filtering moves from browser to shared service before pagination. Preserve canonical spec status, independent taskScope for linked metrics, spec.taskIds relationship semantics and the legacy archive chip. Progress is global unless explicit task/window filtering creates a labeled subset. Same pagination contract as Tasks.
- Overview: dedicated DTO containing only displayed Overview signals/health/lists, without board/timeline/task-array payloads. Extract/reuse the current deterministic derivations; this slice need not redesign its critical-path algorithm. Overview may retain its current full displayed lists in this migration; no new promise of overview volume performance. Do not let its health/status/critical-path work execute for Tasks/Specs/detail.
- Timeline: dedicated DTO containing timeline groups/selection/mode and filter metadata only. Extract/reuse the existing timeline computations and preserve units, tracing and legacy archive semantics. Do not serialize the unused duplicate flat timeline.items if the component only needs its count: expose total task/row count instead. Algorithm/virtual-window work remains TASK-130; do not claim its large-chain gate passed in TASK-126.
- Canonical detail GET routes reuse the request context and existing detail projectors, preserve legacy HTTP200 + found:false for missing details and the existing question action; TASK-128 adds coherent HTTP404 handling. Extract context-accepting pure overload/helper if necessary; keep current rootDir public wrappers backward compatible. Do not add refresh/focus refetch to detail pages in this slice. TASK-128/129 owns detail/draft-aware refresh. No shared shell refresh button is visible or registered on these routes.
- AnalysisFilters takes a narrow filter/options contract, never a fake DashboardData filled with empty arrays. No domain status/archive/progress logic moves to web components.

## Spec filter options

Use a small shared deterministic options query, not the full 2,000-title catalog and not silent title truncation. GET `/workspace-options` returns spec options searched by normalized ID/title, ID-stable order, 50 per page (maximum 100), totalMatching/page metadata and a revision. The route SSR DTO contains the first/requested option page and selected options looked up by ID, deduplicated. Selected options remain selected when absent from the visible search page; hidden repeated `spec` inputs preserve them without duplicate submission. Unknown IDs follow the list normalizer's explicit existing policy.

Reuse the checkbox/details control with a search field and pager, not a new combobox framework. Non-JS GET round trips on the current route with presentation query keys `option_q` and `option_page` make later option pages searchable and selectable. These keys do not alter the domain list query and do not clear current filters; a separate option form preserves the current canonical list query and selected values. Applying changed filters resets the list page to 1. Include an explicit Apply submit button for no-JS operation. JSON option fetches use their own abort/sequence ownership and never overwrite list data or current selections. Measure total SSR/list payload including supplied options; 250 KiB budget is not satisfied by moving the same catalog to an automatic second request.

## Request-local context and shared services

Use a lazily initialized Promise on `event.locals` for this request's canonical context and analysis index. Set the Promise before awaiting it, so concurrent layout/page calls reuse the same load. Directly pass this request source to shared pure route projectors. One loadProjectContext and one task analysis index per server request; no global Map keyed by root, module singleton, cross-request memoization or retained body cache. Resolve project root on the server; endpoints accept route/query only, never a filesystem root from the client. AGENTS health is requested only by Overview.

The request source may lazily memoize route-local expensive derivations, and supplies one `now` to all window predicates. Snapshot consistency is filesystem best effort, not a transaction. Existing buildDashboardData remains a compatible facade with its existing defaults; shared extraction is allowed but route calls must not invoke that facade and then discard most of its output. Tasks/Specs/options/detail must not evaluate overview status/critical-path or timeline derivations. Preserve the indexed engine contract already authorized: unique direct dependent count and only done satisfies dependency gates.

## Controlled refresh transport and state

Approve GET `/workspace-data?route=overview|tasks|specs|timeline&...` with a strictly validated discriminator. Both SSR and GET invoke the same shared route builder and produce a discriminated envelope: `{schemaVersion:1, route, requestKey, revision, generatedAt, shell, data}`. `data` is the route DTO above, never DashboardData. `requestKey` identifies normalized route/list/presentation query; `revision` deterministically identifies the loaded inputs/projection, excludes wall clock/run IDs and is not treated as a sequence counter. Include normalized query in list data. Server request failures return an appropriate non-2xx small JSON error; no success-shaped empty result. Responses are `Cache-Control: no-store`.

A small Svelte resource/controller owns the active route snapshot; SSR initializes from page data. A context registration exposes the active resource's refresh to the shell. Pages and shell render the same accepted envelope on success (shell git and page rows cannot be committed independently). Scope it to the active route: on navigation/SSR seed replacement invalidate the generation, abort the prior fetch and unregister the previous refresh handler. Never mutate SvelteKit data props or a global page store to fake load completion. Root layout shell data is the SSR fallback before the active resource registers. No framework dependency is needed.

Manual refresh fetches the current route/query with AbortController. Focus refetch uses a 150 ms debounce, only for the visible active route when more than 5 s has elapsed since the last attempt, and coalesces with an existing request. Manual requests may supersede pending ones. Set a 15 s client deadline that aborts and yields the same retryable stale-data state; it is not a promise that synchronous server filesystem work is cancelled. Own supersession/navigation aborts are silent; a network abort/error, timeout, non-2xx, malformed envelope or route/key mismatch preserves the previous snapshot and displays `Datos anteriores` plus Retry. An old success or error must not clear/replace a newer request's data/error/pending state. Use request sequence plus route generation, not revision ordering.

During refresh keep rows mounted, scroll and focused element intact; do not remount the view, reset preferences/filters or call goto/invalidateAll/window reload. Success replaces data atomically and updates `Actualizado HH:mm:ss`; failure preserves prior last-success time. Keep the refresh control mounted and focusable while busy (aria-busy/state; ignore/coalesce repeat as appropriate). Key existing task/spec cards by entity ID. If the focused entity disappears on success, deliberately move to the nearest surviving visible entity or stable toolbar fallback and announce removal; do not leave focus on body. Navigation/filter GET links remain normal SvelteKit/HTML navigation in this slice; the preservation guarantee here covers manual/focus refresh, not a new client router. No-JS renders route data and working links/forms from SSR; JS-only refresh controls are hidden until mounted.

## Required evidence before review

1. Shared-service tests for normalization/status/archive/sort/paging/legacy links and identical SSR/JSON semantics at a fixed clock. Spy/instrument request source to prove single canonical load/index and no unrelated derivations on Tasks/Specs/detail.
2. Fixture 10k tasks/2k specs: page100 payload <=250 KiB including shell/options, no bodies, foreign-route arrays or eager full options catalog; rows and DOM bounded. Record list timing separately from deferred Overview/Timeline costs.
3. Browser manual refresh and focus refresh: success shows external change; abort/non-2xx/malformed JSON leaves exact old data, URL, scroll and focus; Retry succeeds. Reproduce blocked `__data.json` requests: controlled refresh must make no SvelteKit invalidation/navigation request or full-page navigation.
4. Deferred A then B responses, navigation away/back with same query, and superseded late errors: only the current generation/request may commit. Timeout exits busy with old data retained.
5. JS-disabled SSR navigation, option search/page/apply and list paging work. Native detail question action remains usable and untouched by background refresh. Fresh packaged-source smoke still passes.

Self-review: scope remains route contracts/transport. Explicitly deferred algorithms/UX are not acceptance waivers: Tasks table127, inspector128, Specs/draft guards129 and timeline volume130 still must complete before the overall revamp is done.

### Normalization follow-up with implementer

- Approved `workspace-query.ts`/`workspace.ts` root service split; status sorts use canonical enum rank (Tasks rank effectiveStatus), maximum two user keys plus ID tie, q uses trim/NFKC/toLowerCase without locale-dependent case folding.
- Priority is ANY finite numeric value accepted by current domain.asNumber: 0, negatives and fractions are valid existing data. Do not impose a new positive-integer rule in the query. Empty/NaN/Infinity query values are invalid; numeric equality and serialization must round-trip canonical finite values.
- Pathological option labels may omit the description only with explicit labelOmitted/reason and visible explanation while retaining selectable ID and any selection. This is a budget escape branch, not the normal label presentation; never silently drop a selected value or reject all results due to one oversized title. Normal fixtures retain full titles. The budget still includes option metadata and selected options.


# Partial service review evidence

Astra independently approved the nine frozen engine/query/service files after fixing option_pageSize round-trip and timestamp-offset sorting. The historical engine implementation was used as an independent oracle for 300 seeded graphs and 10,738 summaries. Initial service checks: 43 tests/3,448 assertions; affected fix checks: 15 tests/115 assertions; real loader spy: 1 test/5 assertions confirming one load/index per request. Frozen hashes: `/private/tmp/spm-task126-services-review-final.sha256`; report: `/private/tmp/spm-task126-services-review.md`. This does not close TASK-126 or certify frontend, filesystem/HTTP latency or global UI budgets.


## Refresh identity correction — external deletion

Approved during integration: requestKey identifies syntactically normalized request intent, never the dataset-dependent effective query. Compute it before page clamping or known-spec filtering; the same function is used by SSR and JSON. Stable route presentation policy (temporary Board forcing unarchived) may be included, but no document existence, totals, clock or revision. normalizedQuery stays the effective/clamped query. revision and request ownership remain separate concepts.

Manual/focus refresh leaves the URL and history unchanged. If URL page=2 now clamps to page=1, accept that envelope, display actual page/range in the pager and announce that the requested page no longer exists and page1 is shown. Pager links derive from the effective page. Repeated refresh still asks for the original URL intent; if enough data reappears it may show page2 again. This is preferable to a refresh-triggered navigation/seed reset, and maintains the existing URL-preservation guarantee.

Keep the current shared behavior that drops syntactically valid spec IDs absent from the source from the effective query. Add filters.unavailableSpecIds (valid requested IDs minus known IDs) and a visible explanation that those filters could not apply. If none remain, explicitly state that results have no spec filter; do not silently broaden the visible set. Preserve the requested URL through refresh; a subsequent explicit Apply/Clear can write the effective query. If the spec reappears, the same original request applies it again. Missing IDs are domain refresh information, not a transport failure.

Tests must cover 101→100 and 101→0 rows while requesting page2, deleted A from A+B, deleted sole A, reappearing A, SSR/JSON key equality, distinct intent keys, and unchanged sequence/generation rejection of late responses. Query/projector/DTO/validator/test changes invalidate their previous frozen hashes/review and require affected-delta review. No new navigation framework or product mutation is introduced.


# Detail GET compatibility correction

Astra verified the historical route behavior: missing full-page details return HTTP200 with found:false. Preserve that legacy contract in this query/transport slice. The earlier 404 assumption in the technical note is superseded; TASK-128 owns coherent HTTP404 and inspector not-found behavior. Existing POST actions are unchanged.


# Approved implementation checkpoint

Astra approved the final 71-file manifest after independently reproducing the two UI findings and confirming their correction. Catalog refresh now adopts current labels/counts while retaining draft selection and unsent text; Clear resets pending values even at the same URL. Sixteen focused regressions pass. All 71 manifest hashes and the nine independently reviewed service hashes matched. Browser ownership was released. Prior global evidence: 279 passing tests, 90.49% function and 91.04% line coverage; Svelte check, build, AGENTS and diff checks pass. Serialized HTTP fixture (10000 tasks, 2000 specs): Tasks warm p95 557.46 ms/37279 bytes; Specs 551.40 ms/35670 bytes. This is warm measurement, not OS-cold certification. Durable evidence: `web/verification/SPEC-062-P2.md`, `p2-filter-review-report.json`, `p2-http-benchmark.json`, and `p2-manifest.json`. Missing detail GET remains legacy 200/found:false until TASK-128.
