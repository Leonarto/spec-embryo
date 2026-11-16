+++
doc_kind = "task"
id = "TASK-138"
title = "Bound workspace detail relations for high-volume inspection"
summary = "Paginate shared task and spec detail relations across transport, inspector and canonical views while preserving complete access and legacy services."
status = "in_progress"
spec_ids = ["SPEC-062"]
depends_on = ["TASK-128", "TASK-139"]
blocked_by = []
priority = 1
owner_role = "implementation"
created_at = "2026-11-15T23:01:11.956Z"
tags = ["parallel-implementation", "volume"]
updated_at = "2026-11-15T23:59:58.662Z"
+++

# Execution and review

Implementation: Sol 6.1 High (`harness_implementation`). Technical decisions and independent UX/contract review: Astra High. Commit the reviewed slice before dependent question work. No final performance gate is waived.

# Verification record

Implementation pending. Independent Astra design review APPROVED after closing requested-page versus accepted-window behavior and atomic source-revision acceptance; no performance acceptance is claimed.

# TASK-138 — bounded detail relation transport and readers

Mandatory completion checkpoint after128, before final131. This closes demonstrated Task/Spec fan-out; it does not redefine the warm-detail p95≤300ms budget. No new write path, scheduler, dependency or model.

## Ownership and sequencing

138 owns shared detail projection/DTO/validator, detail transport, relation presenters, canonical detail loaders and integration in TaskDetail/SpecDetail/inspector. Preserve legacy `buildTaskDetail*`/`buildSpecDetail*` signatures and full-result semantics (canonical question evaluation currently consumes full linkedTasks). Avoid changing canonical action bodies;129 owns write guard/questions later.

Dependencies:138←128;129←128+137+138;131 waits138+129+130. Do not run138 and129 concurrently: they share SpecDetail, detail revision, canonical load/action recovery and inspector integration. Safe parallel alternative: after128, H138 handles detail files while UI130 handles Timeline route/components, workspace timeline projection/diagnostics and its tests.130 must not edit detail/inspector files, must consume138's committed API before its final integration gate, and131 must wait both. Shared AGENTS/managed docs remain root-owned. A review freeze against changing shared sources is not allowed.

## Projection and compatibility

Add a dedicated deterministic bounded detail projection (for example `src/services/detail-relations.ts`) behind workspace-detail, reusing the same ProjectContext, analysis index, parsers and status derivations. Existing full-detail service outputs remain unchanged. Initially wrapping the full result is semantically valid, but only bounded projection results may be serialized; optimize internal materialization if profiling requires it without rewriting domain logic.

Workspace detail envelope becomes **schemaVersion2** because relation array shapes change. All inspector/canonical readers and validator migrate in the same checkpoint; unknown versions are rejected while retaining previous valid state. Full document, metadata, progress/current state, questions and decisions remain intact, including future129 source revision; never pretend a relation slice is the complete legacy linkedTasks array. No body-length truncation is introduced.

Relations:
- Task: dependencies, blockingTasks, unmetDependencyIds, linkedSpecs, relatedHandoffs.
- Spec: linkedTasks and relatedHandoffs. Return each linked task once, with group identity/title sufficient to render existing group headings/order; do not duplicate task objects in both linkedTasks and linkedTaskGroups. Aggregate progress/group totals remain full-set values.
- Preserve legacy order, duplicates, reference omission/status semantics exactly; slice presentation order, not a new sort. For grouped Spec tasks use group order then task order from the existing builder; page across that sequence with at most100 tasks total.
- Each relation window contains `page`, fixed `pageSize:100`, `total`, `totalPages` (at least1), and `items`; all counts safe finite integers. Empty relation=page1,total0,totalPages1,items[]. Requested page is a safe positive integer, otherwise1, then clamped. Expose exact totals and current range; no invisible overflow truncation.
- Serialize relation rows with only fields their existing reader uses (IDs, titles, summaries, displayed status/priority/group as applicable), not nested dependsOn or unrelated task metadata. Text remains full; cardinality bounds do not imply a universal byte bound for arbitrary long titles/documents.
- Bounded not-found response: keep404, identity and an ordinary list link; omit the unbounded availableIds enumeration from workspace v2. Legacy builders retain it.

## Transport and URL

Initial detail v2 includes one window for each applicable collection, default first page. A read-only relation-page request uses the same shared projection/source, identity, allowlisted relation and requested page; it returns schemaVersion2, identity, relation, request intent (before data-dependent clamp), source revision and that window. A dedicated `/workspace-relations` GET is appropriate; malformed kind/id/relation→400, absent entity→404, internal failure→500. Never fetch a complete detail/document merely to change a relation page.

For SSR/no-JS canonical and inspector URLs, allowlist `rel.<collection>=<positive page>` for the above names. Links retain route/list/filter/inspect/section parameters, change only their relation page, and work as normal GET. Shared parse/serialize logic handles these presentation parameters; no web domain filtering. Remove all rel.* on a different inspector identity or Close; section/mode changes retain them. Unsupported relation keys for a kind are ignored in SSR normalization and rejected on the dedicated endpoint. Do not include rel.* in list query/reset identity. Browser enhancement may intercept these links and replace the current URL through public Kit APIs, preserving inspector history ownership; native/modified clicks remain links.

Relation fetches have per-collection abort/sequence plus current entity generation, matching request intent and revision. An obsolete/out-of-order response never changes the reader. A changed source revision cannot silently combine new relation rows with stale detail totals: retain old content, show a recoverable refresh-details message, then use the existing controlled detail refresh path. Do not discard a canonical answer draft;129 will extend the same boundary with its dirty guard. Failed page fetch retains prior window/focus and offers Retry. Pagination never remounts document/Mermaid or questions, and independent collection changes retain other readers. No persistent cross-request cache with weak invalidation is authorized merely to meet latency.

## Gates and measurement

Test both Task9999downstream and Spec10klinked tasks, plus high dependencies/unmet IDs/linked specs/handoffs and mixed/missing/duplicate relations. Verify first/middle/last/clamped/empty windows, full totals/order equivalence to legacy output, group boundary splits, no task-object duplication,100-items-per-collection serialized/mounted bound, and source documents unchanged.

Canonical + inspector JS/no-JS must reach the final item through real links, preserving unrelated URL parameters and404/error behavior. Verify initial SSR/hydration matches, mounted identity/focus through pager and breakpoint, stale revision/out-of-order/retry, and initial closed-list detail/Mermaid lazy boundary. Tests must check actual serialized output so no legacy full arrays are accidentally spread into v2.

Profile separately project-context IO, projection, serialization, HTTP and actual hydrated detail render on the agreed large fixture. H's preliminary in-memory measurements (~5–7ms projection and ~4–6ms stringify) do not establish end-to-end latency and suggest context IO is a likely cost, not proof. Warm-detail p95≤300ms remains a real gate; do not substitute cached in-memory timings or small fixture results. If bounded transport still fails, report the failing layer and obtain Astra's measured optimization decision before declaring138/131 performance complete. No OS cache purge, hidden cache freshness relaxation or budget relaxation.

## Independent-review closure D138-1 — URL intent versus accepted windows

Maintain two explicit concepts: desired page vector parsed from current URL, and the accepted relation windows belonging to the displayed detail snapshot. They may differ while pending or after an error; never relabel retained rows as the requested page.

An enhanced pager activation first replaces only its `rel.<collection>` intent using public Kit replaceState plus the inspector ledger update, preserving unrelated current URL/state; then starts that collection request. Pending: retain accepted rows and range, indicate requested page. Failure: retain accepted page/range and display an explicit message such as “Could not load page3; showing page2”; Retry targets desired page3, not accepted page2. Pager range and Previous/Next math use the accepted window; a numeric page input may show requested intent only if labelled Requested page. Ordinary/modified links remain real GETs. A later valid activation supersedes the prior request. No failure clears the desired URL silently.

Observe changes in normalized rel.* intent independently of entity/section, using the existing reactive workspace URL adapter. Same-entity Back/Forward, canonical navigation and reload must reconcile the relevant relation resources, even if identity is unchanged. State/URL observation must not re-fetch when the accepted snapshot already satisfies that intent/revision. An entity change clears all prior reader generations; Close/new identity removes rel.* as already specified.

Validate response request intent before considering its effective/clamped page. On success, atomically accept that collection's window and canonize a clamp by replacing only the applicable rel.* key on the **current** URL, with public Kit/ledger operations. This accepted effective page is satisfied state, not a new fetch. At page1 omit the key. Never overwrite unrelated filter/trace/inspect/section parameters from the request's old URL. SSR renders the actual clamped range; hydration may canonize the corresponding keys without a duplicate initial fetch. Native no-JS links calculate from the accepted range.

Every full detail load/refresh sends the entire currently desired page vector, not defaults or only the last edited collection. Thus focus refresh, Retry detail and manual refresh preserve requested pages of independent collections. On full success, clamp keys are canonized together on the current URL; untouched keys stay intact. All resource identities include normalized page intent before dataset-dependent clamp.

## Independent-review closure D138-2 — atomic snapshot acceptance

Canonical loader retains `sourceRevision` explicitly alongside detail, just as inspector envelope retains the workspace source revision. It is the **global source snapshot revision**, not129's `specRevision` hash of the spec file; neither substitutes for the other. Displayed detail, totals and all accepted relation windows share one sourceRevision. No canonical reader may discard it.

Use an entity/full-snapshot epoch plus per-collection sequence/abort. A relation request captures entity identity, epoch, current sourceRevision and collection intent. Accept only if all still match current state, the latest collection request and the returned intent, and **response revision = captured revision = currently displayed sourceRevision**. Another collection accepting a page of that same revision does not invalidate independent requests. Merge only that collection; keep all other accepted windows and reader state.

Starting a full refresh increments the epoch and aborts/invalidates all relation requests immediately. Preserve the entire prior accepted snapshot while pending; do not publish new metadata/totals before its windows. Temporarily disable enhanced pager activation while full refresh is pending, retaining ordinary hrefs for native/modified navigation and explaining loading. Browser Back/Forward or another external URL intent change cannot be disabled: abort the pending full request and restart one for the latest complete desired vector. Never accept a full response for an obsolete identity/vector/epoch.

Full success atomically swaps detail, totals, every relation window and sourceRevision, then reconciles clamped URL keys and clears superseded request/error state. Full failure keeps the complete prior snapshot and current desired URL, with a detail-level error/Retry; it does not reset independent pages to1. Retrying reads the latest full desired vector. In-flight responses from the old epoch are ignored even if their revision string happens to equal the new one.

A relation response with a different revision is rejected without changing rows/totals or the desired intent; retain content and request a recoverable explicit full-detail refresh. Do not silently refresh away a canonical answer draft.129's dirty/conflict policy will consume that refresh boundary. Pagination itself must never remount questions/document/Mermaid or discard input state.

Required race cases: relation page3 failure while page2 retained; same-entity Back/Forward during a pending request; clamped success with unrelated query edits; focus/manual refresh preserving pages in multiple collections; two relation requests with out-of-order completion; source change between them; relation arriving during/after full refresh; full-refresh failure; new full snapshot followed by an old-revision response; canonical sourceRevision retained and distinct from future specRevision. Assert rows, totals, range labels, URL intent, Retry target and focus, not just response codes.


# Independent design review

# TASK-138 design review

**Status: APPROVED — independent design review; implementation remains pending.**

Scope: independent design review only, against TASK-138, its decision note, approved 128/129/130 contracts and current detail/service/controller code. No product edits, browser sessions or implementation tests. Applied repository self-hosting and spec-reviewer skills; CLI task list consulted (task show is unsupported).

## Findings resolved by the final decision note

### D138-1 — Define URL intent and accepted-page reconciliation
**Severity: YELLOW.** Decision note lines 27–31 permits shallow replacement and retains a previous window after failure, without specifying which page drives URL, visible range, Retry, same-entity history or subsequent whole-detail refresh. Current `web/src/lib/inspector/controller.svelte.ts` accepts identity/section changes only; `detail-resource.ts` refresh requests omit all relation pages. Repro scenario: open page 2, request page 3 and fail, then focus-refresh or return via same-entity history. An implementation can silently show page 1 under page 3, or stop reacting because identity did not change.

Specify requested-page versus accepted-window state, URL update timing, honest failed/clamped-page display, Retry target, observation of relation-only URL changes, and full refresh carrying all current requested pages. Add a targeted sequence gate, including SSR/hydration and no-JS links.

### D138-2 — Bind relation acceptance to the current complete snapshot
**Severity: YELLOW.** Note lines 15 and 31 should distinguish global source revision from the future spec-file write revision and specify the full-refresh race. Current canonical loaders destructure `{detail}` and discard envelope revision. Scenario: relation request starts at source A, full detail B is accepted, then relation A completes. A check against captured A alone is insufficient; merging it into B violates the intended coherent snapshot.

Expose the global source revision to both canonical and inspector relation resources, keep future `specRevision` separate, and accept a relation only against the currently accepted detail revision and current intent/generation. Accept full detail and all included windows atomically, invalidating pending old relation work; retain the whole previous valid snapshot on failure. Define how full refresh and a newer pager intent resolve so older whole responses cannot reset the newer page.

## Already coherent

- Separate v2 detail DTO preserves full legacy builders and action evaluation; bounded 404 avoids availableIds fanout.
- Every applicable collection is windowed at 100; complete bodies/questions/decisions and full-set aggregate totals remain available. Spec ordering follows existing groups, preserving duplicate occurrences rather than deduplicating IDs ("once" means no second copy in a parallel grouping array).
- Native GET links and SSR make all relation occurrences reachable; list query identity excludes relation presentation params.
- 138 precedes 129; 130 can proceed only within Timeline ownership and integrates against the committed detail API. No change to write semantics or Timeline diagnostics is required.
- The performance gate remains measured end-to-end; cardinality does not claim a universal byte bound.

## Final verification

Reread the final two sections of `/private/tmp/spm-task138-decisions.md` (Independent-review closure D138-1 and D138-2). Both findings are closed:

- URL is desired intent; accepted windows retain honest ranges on pending/failure, Retry uses desired intent, same-entity URL changes reconcile, and clamp updates only relevant keys without duplicate fetch. Full refresh carries the complete page vector.
- Canonical and inspector retain the global source revision separately from the future spec-file revision. Relation acceptance checks captured and current revision, epoch, identity and intent. Full refresh invalidates old relation work immediately and atomically accepts all windows/metadata or retains the complete prior snapshot. External intent changes restart the full request; stale completions cannot reset pages.
- Explicit race gates now verify rows, totals, labels, intent, Retry and focus. The refresh boundary preserves canonical inputs for the later 129 dirty/conflict integration.

No unresolved design findings. Ready for Sol implementation after the reviewed 128 commit, with 129 serialized afterward and 130 restricted to its separate Timeline ownership. This approval does not establish implementation correctness or the end-to-end latency gate. No product/managed-document edits or browser use occurred during this review.


# Fresh-read producer prerequisite

TASK-139 now owns the isolated callback-read/per-load concurrency change selected by Astra after measured Node context-loading overhead. TASK-138 starts after TASK-139 is independently reviewed and committed. Both preserve fresh-byte provenance; no cache or detail latency-budget waiver is authorized. TASK-130 may run in parallel with TASK-139/138 under the established separate ownership.


## Related handoffs — explicit v2 limit exception

Code inspection found that the legacy helper `sortHandoffsDescending` truncates matching handoffs to the newest3 before projecting them. For workspace detail v2, expose **all matching handoffs** through the already planned100-item relation windows; exact total is the full matching collection. Legacy `buildTaskDetail*`/`buildSpecDetail*` remain newest3, byte/field/order compatible. This is an explicit exception to preserving legacy presentation truncation, not a change to which handoffs are related.

Use one shared deterministic selector/order helper in src: task matches `activeTaskIds` containing the task OR `relatedSpecIds` intersecting its declared specIds; spec matches relatedSpecIds containing the spec OR activeTaskIds intersecting its declared taskIds. Retain these predicates exactly, including references that are not resolved to loaded documents. Preserve createdAt descending comparison and stable source order for equal dates; no new ID tie-break, deduplication or unrelated filter. Set membership may replace repeated includes scans with equivalent semantics. Each matching source handoff occurs once under the OR predicate; duplicate reference IDs do not multiply rows. Preserve any repeated source entries as legacy selection would.

Legacy presentation applies.slice(0,3) to the shared ordered matches; v2 paginates the unlimited ordered matches and maps only page entries. Do not build a second web-only matching implementation or claim the truncated3 is the full collection. Other relation omission/order rules are unchanged. UI label is Related handoffs with full count/range, not an implied globally latest3.

Targeted regression:201 matching handoffs plus unrelated entries and equal-date ties; legacy result is identical first3; v2 first100/middle100/final1 with total201 and correct clamping. Cover both task/spec OR branches, stable tie order, no multiplication from repeated references, and source bytes unchanged. The general v2-to-legacy oracle must account specifically for this intentional tail expansion while comparing the legacy3 prefix exactly.


# Shared query prerequisite checkpoint

Commit `140f902` independently adds removal of `rel.*` presentation parameters from workspace list URL/reset identity. Its isolated baseline plus standalone regression passes (1 test, 9 assertions); Astra approved the two-file patch before precise partial staging. This avoids a dependency on uncommitted TASK-130 Timeline query changes.
