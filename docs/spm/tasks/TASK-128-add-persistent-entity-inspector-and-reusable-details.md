+++
doc_kind = "task"
id = "TASK-128"
title = "Add persistent entity inspector and reusable details"
summary = "Implement inspect URLs, browser history, responsive drawers, focus restoration and shared detail views."
status = "in_progress"
spec_ids = ["SPEC-062"]
depends_on = ["TASK-127", "TASK-135"]
blocked_by = []
priority = 1
owner_role = "implementation"
created_at = "2026-11-15T18:31:13.662Z"
tags = ["parallel-implementation"]
updated_at = "2026-11-15T21:56:01.797Z"
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

Pending implementation. No acceptance criterion is claimed complete yet.


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
