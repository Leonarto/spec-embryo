+++
doc_kind = "task"
id = "TASK-128"
title = "Add persistent entity inspector and reusable details"
summary = "Implement inspect URLs, browser history, responsive drawers, focus restoration and shared detail views."
status = "todo"
spec_ids = ["SPEC-062"]
depends_on = ["TASK-127", "TASK-135"]
blocked_by = []
priority = 1
owner_role = "implementation"
created_at = "2026-11-15T18:31:13.662Z"
tags = ["parallel-implementation"]
updated_at = "2026-11-15T18:31:13.662Z"
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


# Integration seam for question drafts

Astra requires the host/controller to centralize its actual open/close/entity/full-page/route transitions with immediate allowance in this read-only slice. TASK-129 adds the dirty/saving guard there without changing the public activation contract consumed by Timeline. Do not add unused question state/props now. Installed SvelteKit shallow popstate bypasses beforeNavigate; TASK-129 must gate accepted editor transitions and use its verified ledger for restore/prompt/replay, not pretend popstate is cancelable. Preserve the ledger and central transition design needed by that real forthcoming consumer.


# Independent design review

A second Astra approved the design after requiring one stable host/detail subtree across docked/modal changes, owned inert/focus cleanup and identity/focus/scroll/Mermaid regression checks. The final Stable mounting clarification supersedes the earlier native-dialog preference. TASK-137 owns the Specs list page in parallel; this task integrates the Tasks row consumer first. This is design approval only; implementation review remains required.
