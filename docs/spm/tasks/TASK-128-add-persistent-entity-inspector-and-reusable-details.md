+++
doc_kind = "task"
id = "TASK-128"
title = "Add persistent entity inspector and reusable details"
summary = "Implement inspect URLs, browser history, responsive drawers, focus restoration and shared detail views."
status = "done"
spec_ids = ["SPEC-062"]
depends_on = ["TASK-127", "TASK-135"]
blocked_by = []
priority = 1
owner_role = "implementation"
created_at = "2026-11-15T18:31:13.662Z"
completed_at = "2026-11-15T23:45:08.013Z"
tags = ["parallel-implementation"]
updated_at = "2026-11-15T23:45:08.013Z"
+++

# Scope

Implement P4 of SPEC-062, including the contracts, edge cases and acceptance criteria defined there. Preserve the checkpointed baseline and keep changes confined to this slice.

# Execution and review

- Implementation: Sol 6.1 High (`ui_implementation`).
- Technical decisions and UX review: Astra High. Escalate uncovered design decisions before implementing them.
- Run relevant automated checks and capture evidence required by the spec.
- Move to `review` when implementation and evidence are ready; resolve findings before `done`.
- The orchestrator commits the reviewed slice before its dependent slice starts.
- Update relevant local instructions with the agents-md-maintainer skill.

# Verification record

APPROVED by independent Astra review after F128-core-1 stale SSR reuse and F128-final-1/2 presence-label/Board-focus fixes. Exact 87-file manifest SHA256 5e00c177a38f5ab80dc551ec77a9ff3ffda5916150f8853cf9f804059d99a895 verified with zero mismatches. Evidence: web/verification/SPEC-062-P4.md and task128-manifest.json. 128 browser checks plus 5 focused Board checks; independent Astra targeted rechecks; 38 HTTP/SSR checks against the explicitly attributed earlier snapshot. 356 Bun tests pass (91.61% functions, 92.58% lines; excludes Svelte), final affected web check/build and AGENTS pass. TASK-138 remains mandatory for bounded transport/canonical readers and the unmet detail latency gate; this checkpoint claims functional inspector completion only.


# Missing detail contract

Astra assigns HTTP404 for missing full-page task/spec GET routes and a coherent not-found presentation to this slice. A missing inspector entity shows a local not-found state while preserving the list. TASK-126 deliberately retained the legacy200+found:false GET behavior. Do not alter the existing question POST action as part of this HTTP correction.


# Detailed Astra implementation decisions

# TASK-128 — Astra decisions closing implementation branches

Implement after127 and canonical-detail extraction135 are reviewed/committed. No new dependency. Reuse their table, focus coordinates, canonical detail components and existing deterministic DTOs. Questions remain a canonical-page link until129's dirty/conflict guards are ready.

## Transport, URL and SSR

- Add one read-only GET `/workspace-detail?kind=task|spec&id=...`. Validate kind and canonical ID before loading. A shared server helper projects existing detail DTO from the request-local context/index; both SSR page loads and this endpoint use it. Envelope carries schemaVersion1, kind/id identity, revision/generatedAt and detail. HTTP404 + typed found:false for missing entity,500 for read failure; no-store. Never call buildDashboardData. Details cannot change list/archive/trace state.
- Explicitly choose SvelteKit shallow pushState/replaceState ONLY for inspector open/close/entity/section changes. These APIs are present in installed2.55.0 types (types/index.d.ts3106/3111), so no version assumption/new router is needed. Normal filters/pages/routes still use existing links/goto. Plain identity activation intercepts to inspector; modified/middle clicks keep canonical detail href.
- The server reconstructs a direct `/tasks?...&inspect=spec:SPEC-ID&section=document` URL: thin list + selected detail use the same request source. With no JS, render readable inline detail and normal Close/canonical links; no dead modal controls. URL, not history.state, determines entity/section. Invalid inspect is omitted; invalid section defaults overview.
- Separate list request identity from inspector identity. inspect/section must not change the list data key or cause WorkspaceResource to reseed an old SSR envelope on every shallow URL update. Add an explicit URL-retarget path for same-list-intent changes while retaining snapshot/error/pending/selection/scroll. True list-query navigation continues to seed new server data. Likewise filter draft reset keys exclude inspect/section; opening the inspector must not erase unsubmitted filters. selected_task remains part of Timeline data intent and independent of inspect.
- Opening via JS fetches only detail; section changes do not fetch again. SSR seeds matching identity without a duplicate immediate fetch. New identity aborts prior request, advances generation and shows its own skeleton immediately; never old body under new title. Validate identity/envelope before commit; late success/error cannot overwrite current state. Reuse15s deadline/owned cancellation conventions, Retry only detail. Manual/focus workspace refresh may also refresh an open clean read-only detail; keep old same-identity content on failure with its own stale notice. No background refresh or form mutation of dirty question inputs is introduced before129.

## History and focus

Use a namespaced App.PageState record plus a session-memory entry ledger, preserving unrelated page.state fields. Store verified predecessor entry ID+URL and opener row ID/column key/scroll coordinates when app pushes an inspector entry. Do not infer history ownership from history.length or query presence. On reload/direct entry, absence of the in-memory ledger means predecessor is unverified.

Open pushes once. Previous/next visible entity, relation navigation and section changes replace current inspector entry; relation breadcrumb is local to the inspector. Close uses Back only if the ledger proves the immediate predecessor is exactly current route/query with inspect/section removed. After filter/page/trace navigation, invalidate that shortcut unless exact proof still exists; otherwise replace current URL without inspector, preserving every other current parameter. Test open→filter→close→Back/Forward; it must not rewind filters when closing. Escape follows popup→inspector precedence and leaves selection intact.

Store opener by stable ID/key rather than DOM node. On open, focus the inspector heading (tabindex−1); after successful body load keep that focus unless the user moved it. On close/Back, restore opener cell if visible; otherwise nearest surviving row or table heading, with an announcement. Do not focus body or force a former row back into a changed filter. A delayed response cannot steal focus after the user moved to the list. Opening/docking may reduce available width but preserves both scroll positions.

Use the spec's width rules, based on CSS viewport AND actual workspace width: dock only >=1200 and table region>=560 after a360–640 drawer (initial440); otherwise overlay, full-screen below768. Docked is aside/no trap/no inert. Overlay is a dialog with modal semantics, background inert, cyclic Tab containment and Escape close. Prefer native dialog.showModal for the overlay, inline aside for docked; handle cancel through the same close/history action. Breakpoint changes retain entity and scroll, remove inert on leaving modal, and move focus into the modal if it was outside. Resize separator has min/max/current aria values, arrows16px, Home/End and width menu; no pointer-only behavior. F6/Shift+F6 cycles toolbar/grid/inspector in docked mode, stays within modal when modal.

## Canonical404 and integration surface

Correct canonical task/spec GET status here: use SvelteKit404 with a route error view retaining the root shell and a shared not-found presentation/back link. Do not change the shared detail service's found:false contract or question POST action. Avoid a global error boundary that replaces the workspace. Inspector404 remains local, list operable.

Expose one reusable inspector host/controller and link activation helper to129/130. Host owns transport/history/focus/responsive state; content components own presentation only. Detail fields and links remain read-only in128. No speculative inspector primitives without a consumer; task list and canonical detail pages supply the first consumers.

## Required targeted gate

Direct URL/SSR/no-JS, keyboard open/close, modified clicks, desktop no-trap/mobile trap and resize/reflow; A→B delayed response,404/500/timeout/retry; open→filter→close→Back/Forward; reload with unowned history; outside-filter identity; selected_task unaffected by inspect; filter drafts/table selection/scroll preserved across inspector-only URL changes; no duplicate initial fetch and no list data request on inspector-only JS transitions. Warm detail latency remains measured, not assumed from service timing. Keep later129 dirty-form requirements explicit.

## Stable mounting clarification (supersedes native-dialog preference above)

Choose one persistent host div: role=complementary when docked, role=dialog with aria-modal=true in overlay. Keep the same detail subtree mounted; never key by mode, render separate aside/dialog branches, duplicate hidden content, or move through a mechanism that recreates children. This is required now for reader/focus continuity and later for129's draft state.

The host implements modal focus containment and Tab/Shift+Tab cycling, Escape through the central transition, and inert on sibling background regions (never an ancestor containing the host). Remember and restore the prior inert values changed by this host; cleanup only its own listeners/state. A breakpoint transition changes CSS/role/aria/inert/trap only: preserve an already focused internal node; when entering modal with focus outside, focus its heading. Returning to docked removes trap/inert without invoking Close, changing history, or restoring the original table opener. Actual close/unmount still follows the normal128 contract.

Gate128 must verify the same DOM node identities, internal focus, reader scroll and rendered Mermaid subtree through dock→overlay→dock.129 later adds the draft-specific case;128 must not implement unused form state to pass its reader case.

## Integration and shared visual refinement

Approve one host/controller in +layout, rendered within WorkspaceShell main; initialize its context before route children. Tasks registers current rows/focus/scroll with cleanup. Layout.server loads optional inspector detail only on exact list routes /tasks, /specs and /timeline, through the same request-local source Promise used by page loaders. Canonical detail routes retain their own thin load. Shallow identity/section transitions must not reseed old SSR results.

TaskDetail/SpecDetail gain presentation=inspector for compact metadata/spacing and persistent section anchors; do not implement destructive tab mounts. Questions in the inspector remain a genuine canonical-page link until129. Common styles must modernize BOTH page and inspector: solid semantic surfaces, body typography for data, thin borders, appropriate focus/control contrast, no decorative gradient/translucent card surfaces or heavy card shadows. Preserve canonical content/order and question action behavior. Canonical question controls may receive the common visual skin now, but draft/revision/write semantics remain129.135 certified extraction parity only; its preserve-styles instruction ends here and the detail AGENT must be updated accordingly. Audit canonical and inspector views in both themes/desktop/mobile;131 validates the combined result, not an undisclosed carryover of legacy visual debt.

### Lazy component bridge for SSR and hydration

Approve +layout.ts universal load resolving the detail component via import() only when +layout.server data contains a valid SSR inspector. Return the component from universal data, never server data or a JSON envelope. Installed SvelteKit supports this separation: types/index.d.ts Load output is Record<string,unknown>, and runtime/server/page/load_data.js207–257 passes server data into universal load then returns its result for rendering. The client universal load independently resolves the same module during hydration; use the server-provided DTO, no second detail fetch.

Closed lists must not execute detail/Mermaid imports or pull them through a static barrel. JS opening waits for module and DTO under the same identity/generation, with skeleton until both resolve. Stale module completion cannot replace a new entity; module errors remain local with Retry/canonical link, including SSR where the list remains available. Code-module import caching is allowed; it is not a global project context cache. Section/docking changes do not reimport or remount. Gate closed-list import/network closure, direct inspector SSR/noJS, no duplicate hydration fetch and delayed/failed module races.

### Width controls are docked-only

Resize handle/menu operate only docked. Overlay width is min(520px, CSS viewport−32px), fullscreen below768. Preserve the docked360–640 preference when entering overlay. Dock eligibility uses that preferred width plus>=560 table region and actual gap/borders; insufficient window space switches to overlay rather than silently rewriting the preference. While resizing docked, effective maximum=min(640, available workspace width−560−separation); expose it to aria-valuemax/HomeEnd and disable menu sizes that cannot fit, preventing the gesture itself from flipping mode. A breakpoint change ends an active drag/releases capture. If the width control holding focus disappears, focus the stable heading; do not close, navigate history or restore the table opener. The detail/editor subtree stays mounted.

## Installed shallow-routing URL adapter

Verified installed Kit runtime/client/client.js2357/2404: pushState/replaceState update browser history and page.state, not page.url. Shallow popstate may populate page.url from PAGE_URL_KEY carrying the routed/base URL. Therefore page.url alone cannot be inspector identity after shallow transitions.

Use one workspaceURL() adapter, with reactive reads of BOTH page.url and page.state on every invocation. In browser return a fresh URL(location.href); on SSR return a fresh URL(page.url.href). State is only the reactive signal/ledger marker, never a second entity/section authority. No cached mutable URL store, local fallback variants, direct native history writes or reads of Kit private history keys. All shallow mutations keep using Kit APIs with a new state object preserving unrelated fields. Use the helper inside tracked derived/effect contexts, not a one-time module capture; ordinary event builders read it at activation time.

Apply it consistently to controller identity/history proof, host links/copyLink, query href builders, Clear/filter forms, ListPager, and resource URL retargeting. Data-list request keys, search/draft reset keys and selection keys still exclude inspect/section through the shared list-intent helper. An inspector-only URL change cannot trigger list fetch/reseed, clear typed filters or replace a fresh snapshot with old SSR data. Ordinary list navigation still uses goto/GET and committed SSR seeds for its actual list key. No independent adapter listener should preempt Kit's navigation cancellation or create another router.

Coordinate route ownership: Specs137 and Timeline builders also read page.url. Do not edit the Specs page concurrently with137 or let137 silently depend on unreviewed128 source. Serialize their adoption after the relevant reviewed commits, before claiming128's final cross-route query-preservation gate;129/130 keep using this single adapter rather than fork it.

Targeted tests: direct SSR/hydration with no window access on server/no duplicate detail fetch; open/entity/section changes make address bar, inspector, copyLink and generated links agree; real Back/Forward with stale Kit page.url; apply filter/sort/pager after entity/section replacement retains the CURRENT inspect identity; open/close alone retains filter drafts/list selection/scroll and does not refetch list. Revalidate normal navigation/back across list queries with new SSR seeds, so URL observation never incorrectly applies a prior route's data.

## Page membership wording clarification

An ID absent from the registered current page is not proof that it fails the global filter. For a registered, comparable same-kind result set with no matching ID, display **“Outside this page of results · Previous/next unavailable”** and disable both navigation controls. Preserve the inspector entity, URL and detail; do not fetch global membership or duplicate filtering in web. For an unavailable/non-comparable result context (including another entity kind), use **“Previous/next unavailable in this view”**, without asserting absence. Returning to a page containing the ID restores page-relative previous/next normally.

This qualifies earlier outside-filter wording: the supported observation is membership of the loaded page, not global filter membership. Root should reconcile SPEC-062 inspector/QA wording and TASK-128 accordingly; the outside-filter test remains valid as one instance of an entity outside the loaded page. Add the distinct matching-but-other-page case after sort/paging and recovery on returning to its page. No DTO, endpoint, service or query semantics change.

## Fan-out containment and explicit completion checkpoint

Observed Task fan-out (9,999 blocking tasks; about 3.50 MB JSON) is not a latency percentile and must not be presented as meeting the 300 ms warm-detail gate. Related Spec fan-out duplicates linkedTasks and group task arrays (about 7.00 MB for 10k linked tasks). This is a real remaining volume problem.

128 contains inspector DOM now: at most 100 mounted items per relation collection, local JS pagination replacing the window rather than accumulating items; count/range, accessible Previous/Next, original ordering, canonical full-detail link. SSR shows first100 plus that working link, with no inactive pagination controls. Spec linked-task groups share one100-task budget across groups, not100 each. Cover task dependencies, blocking tasks, unmet IDs, linked specs, handoffs and spec linked tasks/handoffs. Preserve original totals/metrics, document/Mermaid subtree and questions/decisions. Pages reset on identity change, clamp on refresh, persist through breakpoint/section changes; retain pager focus or an associated heading if its control disappears. Test9999fan-out first/last windows and bounded DOM. Canonical and transport are deliberately unchanged in128 and remain pending volume work, not a claimed completion.

TASK-138 must complete shared paginated relation transport and canonical/SSR/no-JS bounded readers after128 and before final acceptance. See `/private/tmp/spm-task138-decisions.md`. Root must track this dependency explicitly. Merely recording the issue for QA131 is insufficient.

## Mermaid SSR controls

Hide zoom controls until mounted and a usable SVG exists; no zoom controls during initial loading or error. Before mount/no-JS show readable source and an explicit JavaScript-required message instead of an indefinitely rendering placeholder. Preserve JS rendering, source fallback, lazy Mermaid import and shared canonical/inspector presentation. This is a128 presentation fix, not a new parser.

## Board close/focus review correction — contained enhanced scrollport

Final review found Board close restoring BODY because Tasks registration only targeted DataTable. Make the existing registration view-aware: Board captures its own scrollport and outer frame, restores the task-id anchor by stable ID (nearest surviving card/toolbar fallback with announcement), supplies list-region focus/F6 and recognizes the Board region. Keep Table behavior and semantic Board roles unchanged.

A deeper author repro then showed frame.scrollTop703 moving the docked drawer header to top−647. Approve minimal CSS containment **only for enhanced Board**: a mounted&&view=board parent class sets height100% and min-height0, overriding the mobile heightauto/min-heightcalc rule as well; Board flex1 1 auto, min-height0, min-width0, overflowauto is the single X/Y card scrollport. Toolbar, note and pager remain outside and nonshrinking. No per-lane scrollers, fixed inspector or layout placeholder. SSR/no-JS remains natural heightauto without that enhanced flag; Table is unchanged. On an exceptionally short viewport prefer reachable outer overflow over clipping controls; do not introduce arbitrary fixed minimum heights.

Focused gate: deep Board X/Y scroll keeps inspector header and toolbar reachable, Close/Escape restore same card ID and scroll in docked/modal modes, missing-card fallback works, F6 cycles toolbar/Board/inspector, last card remains keyboard-reachable, and no-JS content is not clipped. This is necessary to meet128 persistence/focus guarantees, not a new Board feature.


# Integration seam for question drafts

Astra requires the host/controller to centralize its actual open/close/entity/full-page/route transitions with immediate allowance in this read-only slice. TASK-129 adds the dirty/saving guard there without changing the public activation contract consumed by Timeline. Do not add unused question state/props now. Installed SvelteKit shallow popstate bypasses beforeNavigate; TASK-129 must gate accepted editor transitions and use its verified ledger for restore/prompt/replay, not pretend popstate is cancelable. Preserve the ledger and central transition design needed by that real forthcoming consumer.


# Independent design review

A second Astra approved the design after requiring one stable host/detail subtree across docked/modal changes, owned inert/focus cleanup and identity/focus/scroll/Mermaid regression checks. The final Stable mounting clarification supersedes the earlier native-dialog preference. TASK-137 owns the Specs list page in parallel; this task integrates the Tasks row consumer first. This is design approval only; implementation review remains required.


# Initial shared-helper reservation

After TASK-127 commits, TASK-137 first fixes AnalysisFilters' conditional taskScope hidden field under a short exclusive reservation. Do not edit that helper until root confirms the tiny patch is independently approved and committed; other inspector files can proceed. Then TASK-128 owns any helper changes needed to exclude inspect/section from draft-reset identity.


# Specs adapter integration reservation

TASK-137 finishes against committed shared components without importing the unreviewed inspector adapter. After its review/commit, root transfers Specs-page ownership to TASK-128 only for adopting workspaceURL in its URL builders before the final cross-route gate. Timeline adopts the adapter in TASK-130. This preserves parallel implementation without a circular dependency or overlapping page edits.


# Parallel verification ownership

After TASK-137 commit439da07, a second Sol owns only web/scripts/inspector-http-check.ts and web/verification/task128-http-report.{json,md}, with disposable fixtures. It verifies endpoint/SSR/404/closed-list import closure/request-key boundaries without browser ownership or product edits. Snapshot /private/tmp/spm-task128-http-source captured 171 identical before/after/copied source hashes on439da07 plus current128 changes; later deltas must be identified. The primary Sol retains interactive history/focus/races/modules/noJS-browser/theme tests. Merge both evidence sets into the final reviewed manifest.


# Independent final review

# TASK-128 independent final review

Verdict: **APPROVED** for the agreed TASK-128 inspector/presentation checkpoint. F128-core-1, F128-final-1 and F128-final-2 are closed. The first-pass findings/evidence below are retained as history; final verification is recorded at the end. TASK-138 remains mandatory for bounded transport/canonical fan-out and the300ms performance gate. Root may commit128 before the next shared-workspace slice.

## Findings

### F128-final-1 — contradictory traversal availability message (closed)

InspectorHost's fallback `else if mounted` showed “Previous/next unavailable in this view” even with a matching registration and a valid index. The final1440 Task capture visibly had enabled Next beside that message. Author applied the minimal condition `mounted && !controller.hasMatchingList` during this review, with root coordination.

Independent real-browser validation on fixture5292 after the patch:
- matching current-page task: no availability warning, Next exists;
- same-kind task229 outside first page: Outside this page of results, Next absent;
- Spec inspector from Tasks: unavailable in this view, Next absent.

All3 states pass. Host's patched hash supplied by author: `0bb4151646fe72286b910af14cb1eb8298be0a1cbc129802dc84cb74fa495140`. Final manifest must capture it. Affected captures should reflect the corrected label.

### F128-final-2 — Board inspector close loses focus (P1, closed after focused recheck)

Reproduced independently at390×844:
`/tasks?view=board&sort=id.asc&pageSize=50` → click TASK-00001 card's `.task-id` → Escape. Inspector closes and URL is preserved, but `document.activeElement` is BODY, not the originating card link.

Tasks page registers the same inspector adapter for Table and Board, but restoreOpener calls only `table?.focusCurrent()`. Board has no DataTable instance. captureOpener, focusGrid and regionFor also only address `[data-table-grid]`, so Board scrolling and F6 region traversal lack a valid implementation.

Minimum correction: make the existing Tasks registration view-aware. Board captures its actual horizontal scrollport and outer frame; restores the canonical task-id anchor by stable ID, or the nearest surviving task/toolbar with announcement if gone; recognizes Board as the list region and provides a working list-focus target. Keep table behavior and existing semantic Board intact; no new role=grid/navigation model. Handle changing view while detail remains open using the current view's actual target.

Required focused gate: Board open→Close button/Escape in docked and modal modes, stable card focus and scroll/query preservation, F6 through toolbar/Board/inspector, missing-card fallback, and Table restoration nonregression. Root/UI received this finding immediately. Browser was closed explicitly and lease released for the fix.

## Independent review evidence beyond findings

- Real browser5292,1440×900→390×844: identical host, detail and reader DOM nodes; the focused relation link remains the same node; reader scrollTop180 is retained; modal aria-modal=true and7 inert regions; document has no horizontal overflow. Escape closes, removes inspector URL and restores inert count0.
- Real Spec230-task relation window: first page100 mounted relation items, final page30 (201–230), focus moves to the range when Next becomes disabled, same detail DOM and unchanged inspector URL. This checks the new bounded presentation independently without repeating the author's9999 fixture sweep.
- Inspected final Task light1440 and Spec dark390 captures: solid surfaces, compact metadata, readable document/relations and persistent anchors. Apart from F1's contradictory banner, no visual redesign requested.
- Reviewed InspectorHost/Workspace, RelationWindow, detail consumers, Mermaid changes and route/filter/URL adapters. Ordinary canonical links, stable host, local pagination replacing the window, source fallback/no dead Mermaid controls and unchanged canonical question action remain consistent with128 scope.
- Inspected128 recorded browser assertions (18history,19responsive,12transport,4modules,13SSR,3seed,9fanout,40themes,6Mermaid,4targets), all recorded pass.38HTTP checks retain separate source-snapshot provenance. These are author evidence, not all independently rerun. The only console error observed independently was missing favicon.ico404, not an application exception.
- The product manifest/report/build were still being consolidated at this pass; no final whole-product hash certification yet. Do not convert the core approval into a whole-task approval.

## Explicit remaining gates outside128

128 contains inspector relation DOM, not its full payload or canonical fan-out. TASK-138 remains mandatory for bounded producer/canonical/SSR-no-JS pagination and the300ms warm-detail budget. RecordedHTTPp95~506/495ms does not meet that budget and is not click-to-hydrated-content measurement. No budget relaxation, new-cache assumption or completed-volume claim is accepted here. TASK-131 retains combined performance/accessibility/package/leak evidence. Question editing/dirty protection remains129;128 introduces no mutation path.

## Final focused recheck and frozen manifest

Final manifest `web/verification/task128-manifest.json` SHA **5e00c177a38f5ab80dc551ec77a9ff3ffda5916150f8853cf9f804059d99a895**: all87 entries independently verified,0 mismatches. Core19 stays unchanged at its approved hashes. Final Tasks source SHA `e3d32201c48c254962c39a8e230acee76655d024d36ad006e76db3232a455f51`; patched Host SHA `0bb4151646fe72286b910af14cb1eb8298be0a1cbc129802dc84cb74fa495140`. Reviewed view-aware Board adapter and enhanced-only X/Y scroll containment; SSR retains natural height and no new grid roles.

Independent live browser5292 focused recheck:
-1440×900 Board deep scrollTop650/scrollLeft54.5, opening TASK-00025 keeps docked header at y57 with frame.scrollTop0. Shift+F6 returns to the visible same card; Escape closes and restores TASK-00025 with exact650/54.5 scroll and original query.
-390×844 Board scrollTop400/scrollLeft20, opening TASK-00004 creates modal/inert7. Close button restores TASK-00004 with exact400/20 scroll, original query and inert0. BODY-focus failure is resolved.
- Inspected author5-check Board report: desktop same/nearest card, modal same/empty toolbar fallback, F6/native Tab reachability and real no-JS natural-height/no-clipping. Programmatic empty-list transport setup is correctly distinguished from a user activating inert background.
- F1's4 refreshed Task inspector captures assert actual theme colors and zero erroneous availability banners; independently viewed corrected dark1440 capture. Earlier independent3 membership probes remain passing evidence.

Inspected final affected check log:0 errors/0 warnings; production buildPASS5.53s; AGENTS pass. Recorded full suite356 passed/0 failed,7244 assertions with91.61%functions/92.58%lines is explicitly Bun scope and predates the final Board-only Svelte fix. That localized fix has final web-check/build and focused browser evidence; no unnecessary full-suite repetition was requested. The earlier38-check HTTP/import snapshot remains attributed to its historical source hashes, not relabelled as current. Final combined package/AT/latency/leak gates remain131.

No open findings in128's approved scope. Browser explicitly closed with browser_close after recheck; lease is free. No product edits were made by this reviewer.
