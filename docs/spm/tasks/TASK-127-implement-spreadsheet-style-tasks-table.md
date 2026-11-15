+++
doc_kind = "task"
id = "TASK-127"
title = "Implement spreadsheet-style Tasks table"
summary = "Implement reusable accessible table, filters, columns, paging, selection and TSV copy while retaining Board."
status = "in_progress"
spec_ids = ["SPEC-062"]
depends_on = ["TASK-126"]
blocked_by = []
priority = 1
owner_role = "implementation"
created_at = "2026-11-15T18:31:13.592Z"
tags = ["parallel-implementation"]
updated_at = "2026-11-15T20:41:42.080Z"
+++

# Scope

Implement P3 of SPEC-062, including the contracts, edge cases and acceptance criteria defined there. Preserve the checkpointed baseline and keep changes confined to this slice.

# Execution and review

- Implementation: Sol 6.1 High (`ui_implementation`).
- Technical decisions and UX review: Astra High. Escalate uncovered design decisions before implementing them.
- Run relevant automated checks and capture evidence required by the spec.
- Move to `review` when implementation and evidence are ready; resolve findings before `done`.
- The orchestrator commits the reviewed slice before its dependent slice starts.
- Update relevant local instructions with the agents-md-maintainer skill.

# Verification record

Pending implementation. No acceptance criterion is claimed complete yet.


# Detailed Astra table decisions

# TASK-127 — Astra implementation decisions

Ready for implementation only after TASK-126 is approved and committed. These close mechanics already required by SPEC-062; no new product features or dependencies. Review126 takes priority.

## Component boundary and route transition

Use Svelte + pure typed helpers, no grid/virtualization framework. `DataTable<Row>` accepts current-page rows, stable rowKey, ColumnDef[], effective sort, controlled selected IDs/focused cell and callbacks. It never fetches, parses Markdown or derives status. `ColumnDef` declares stable key, label, sortable server key, textValue(row), cell snippet, align, default/min/max width and visibility constraints. Display and TSV use the same descriptor; no DOM scraping. Build reusable pager, selection bar and preference/copy helpers now; do not preimplement Specs presentation.

Tasks default becomes Table. Add allowlisted `view=table|board` to the shared route query/serializer/request-key contract, default table. `simple=1` selects table simple mode even if an inconsistent URL says board. Table uses the existing typed task scopes, including archived/all; Board still forces unarchived and states that limitation. Switching to Board writes explicit unarchived scope and resets page/selection; sorting/filter values still supported by Board survive. Board remains paginated, with current-page lane labels. No inspector UI in127: identity links/Enter open the canonical task page; expose onInspect capability so128 can intercept plain activation later. Cmd/Ctrl-click, middle click and open-in-new-tab always keep real hrefs.

## Grid focus and activation

The [WAI APG grid pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/) supports one tab-sequence entry, focus on an individual cell or its single interactive element, and managed arrow navigation. Apply it with these concrete choices:

- Render semantic table markup; enhance to role=grid after mount unless simple mode. Only one target has tabindex=0 across headers and body. Text cell: target is cell. Checkbox/link/sort-button cell: target is that sole control, not its parent. Other targets tabindex=-1. Default target is first data-row ID, or ID header when empty. No independent inner links in multi-value cells; show their readable text and leave relations to canonical detail.
- Model focusedCell with stable row ID (or header sentinel) + column key, not array index. Header is row0 of navigation. Arrows move one cell without wrapping; Up from first data row reaches header. Home/End are row ends; Ctrl+Home/End reach first header/last loaded-row cell. PageUp/Down move one measured visible viewport of rows and clamp within this page; never fetch the next server page. Scroll only enough to reveal the target within the table scrollport, including sticky offsets.
- Tab/Shift+Tab leave the grid naturally; do not cycle inner controls. Enter/Space on sort button or selection checkbox performs only that control's action, once. Space on text/identity does not select a row; Space in selection column does. Enter on identity follows the canonical link in127. Click on other cell content focuses it without selecting or navigating. Ignore grid shortcuts from toolbar inputs/popovers. Escape first closes the open popover and returns focus to its trigger; it does not clear selection.
- Header sort click/Enter toggles asc/desc for that column and replaces other keys. Shift activation adds/toggles a secondary key; if two exist, a newly chosen secondary replaces the old secondary. ID remains implicit final tie. Expose equivalent primary/secondary/remove controls in the sort menu. aria-sort goes on the primary sorted header only; visually label both ranks and use accessible text for secondary direction/rank.
- Headers use one sort control as their grid target. Resize handles are pointer affordances outside the keyboard target sequence; the Columns panel provides fully labeled numeric width controls and Move up/down alternatives. Do not create dozens of extra Tab stops within the grid. No cell editing/F2 mode is needed.
- F6/Shift+F6 cycle the view toolbar and grid;128 adds inspector. Only handle while focus is in these workspace regions, preserving browser behavior elsewhere.

## Selection, copy and refresh

Selection is a Set of IDs limited to loaded rows. Header select-all means this page; reflect checked/mixed/unchecked state, with an accessible page-specific label. Checkbox toggle establishes an anchor. Shift+checkbox click or Shift+Space extends the inclusive visible-row range from that anchor; no valid anchor means a single toggle. Preserve selection outside the range and add the range; clear only through explicit toggles/Clear/select-all. Click/arrow focus never changes selection. Aria-selected on selected grid rows complements the checkbox state.

Clear selection and anchor on user page/filter/sort/view changes and announce it. A same-query data refresh keeps selected IDs still visible, removes vanished IDs with an announcement, and retains the focused row/key if present; otherwise use nearest remaining row at the old position or the toolbar when empty. Failed refresh preserves all three states. Column reorder/hide preserves selection and maps focus by column key; if hidden, move to nearest visible data column. Never use revision alone as a reason to clear selection.

Copy selected rows in visible row order and visible data-column order, excluding selection/actions; include headers. Without selected rows, Ctrl/Cmd+C in the grid copies textValue of the focused cell. Copy IDs is newline-separated. Use plain text/TSV only, normalize embedded tabs/newlines to spaces, and prefix an apostrophe when the first non-whitespace character is =,+,-,@. Preserve the browser's selected-text/input copy, including when a cell's text is explicitly selected. No global copy hijack. Clipboard failure shows a labeled selectable text fallback and never reports success. Empty selection cannot copy all results implicitly.

## Columns and fallback

Selection and ID remain visible/fixed first; title remains visible third. Remaining data columns may hide/reorder via the Columns panel; label locked identity columns. Width defaults are those in SPEC-062. Descriptor bounds: selection fixed36; ID96–180; title200–800; status96–200; priority56–120; specs100–360; blockers72–200; optional numeric columns64–200 and dates120–240 CSS px. Resize is clamped, pointer and numeric-input paths share the same setter, keyboard numeric step is8px. Store versioned column preferences by entity-kind/project with guarded storage, not ephemeral row/focus/selection. Invalid/unknown keys reset/drop safely. Selection+ID stay sticky; title joins them only when total fixed width is <=45% of the scrollport. Use one shared colgroup/grid-width source for header/body; no width-dependent hidden columns.

SSR and JS-disabled output are an ordinary table with caption, scope headers, genuine links, GET sort/filter controls and paging. Before enhancement it must not expose a nonfunctional role=grid. Hide JS-only selection/copy/resize controls until mounted (a blank reserved selection track may preserve geometry). `simple=1` keeps ordinary table semantics and normal native Tab sequence after hydration; selection/copy may remain available as native controls, with no roving grid shortcuts. Same rows/columns/sort/paging and canonical URLs; mode changes do not silently lose filters. Density32/40 and44px touch targets follow the spec.

## Gate evidence

Unit tests for navigation bounds, selection ranges/reconciliation, sorting max2, preferences and TSV safeguards. Browser fixtures0/1/200/10k: exactly one grid tab stop, native-control activation once, exit via Tab, page-bound keyboard, visible focus after scroll/sort/refresh, clipboard denied fallback, column operations without pointer, URL/direct/no-JS/simple-mode parity, Board archive limitation, no product writes. Keep <=200 rendered data rows; use126 performance baselines. Run axe plus direct keyboard review; an axe pass alone does not certify grid behavior.

## Tool artefacts

Approve adding root-scoped `/.playwright-mcp/` to .gitignore in the current UI slice or the next appropriate commit. Local evidence: untracked page-*.yml accessibility snapshots and console-*.log with transient localhost5184/5188 browser failures created during these tests. These are tool-session outputs, not product fixtures or curated evidence. Do not delete them during active work, stage them, or move/ignore `web/verification/` and its durable screenshots/reports. No AGENTS expansion is needed solely for one ignore entry; existing verification documentation can state where durable evidence belongs.
