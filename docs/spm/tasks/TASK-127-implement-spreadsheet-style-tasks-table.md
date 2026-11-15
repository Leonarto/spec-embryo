+++
doc_kind = "task"
id = "TASK-127"
title = "Implement spreadsheet-style Tasks table"
summary = "Implement reusable accessible table, filters, columns, paging, selection and TSV copy while retaining Board."
status = "done"
spec_ids = ["SPEC-062"]
depends_on = ["TASK-126"]
blocked_by = []
priority = 1
owner_role = "implementation"
created_at = "2026-11-15T18:31:13.592Z"
completed_at = "2026-11-15T21:55:56.818Z"
tags = ["parallel-implementation"]
updated_at = "2026-11-15T21:55:56.818Z"
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

Implemented and independently approved by Astra after three corrections. Final manifest: 63 files, all hashes matched. Evidence: 99 valid browser checks (69 retained + 12 corrective + 18 corrected layouts), 159 HTTP snapshot checks, 333 passing Bun tests; Bun coverage 91.43% functions / 91.80% lines, with Svelte/browser scope reported separately. Focused corrective tests: 22 pass / 185 expectations; check 0 errors/warnings, build/AGENTS/diff pass. Astra independently verified row/header Enter exactly once, native Space, no-JS GET filtering and actual dark theme. Desktop density: 19 rows at 1440x900, 14 at 1280x720; text at least 13px. Durable report: web/verification/SPEC-062-P3.md and task127-manifest.json. P4–P7 gates remain separate.


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


# Astra clarifications during implementation

# TASK-127 clarifications

Add `shell.project.key` as a stable opaque preference namespace, computed server-side as full hexadecimal SHA-256 of `spm-workspace-v1\0` followed by the canonical realpath of the project root (the separator is an actual NUL byte in the hash input). Resolve the root in the request/source-loading layer, not a pure projector. The same root through a symlink has the same key; distinct worktrees/roots with identical names have different keys. A moved root starts fresh preferences. Version column/density storage by key and entity kind; do not change existing theme/rail preferences. Never send the root path as this field. Update the shared DTO validator and verify SSR/refresh identity consistency plus equal-name/different-root separation.

Approve two compact toolbar rows: title/count, Table/Board, search, Filters/Columns/Sort/density; then Scope/Preset and applied-filter chips. Full facets use the existing accessible details-popover and GET/Apply behavior, including no-JS support and the126 draft/reset fixes. Responsive wrapping must retain the approved visible-row budget and labeled search. Search keeps its150ms debounce/replace-history contract.

Preset activation changes only scope/status and resets page to1 plus selection; preserve q, spec, priority, window, sort and pageSize. `Not archived` means unarchived with no status filter, including done/cancelled unarchived tasks. `In progress`, `Review`, `Blocked` mean unarchived plus the corresponding effective status. `All` and `Archived` set their respective scope and clear status filters. A nonmatching scope/status combination displays Custom; remaining facets remain visible as chips. All/Archived chosen from Board explicitly switch to Table, with that destination indicated in the option label. Future inspector query parameters remain preserved under128's URL contract.


Astra width clarification: title fills available width only in auto mode, bounded 200–800 px. Numeric and pointer resizing start from the effective width and switch to an exact explicit preference; viewport resizing does not alter that explicit width. Reset restores auto mode.


# Parallel verification ownership

After TASK-136 commit d311060, the second Sol contributes only `web/scripts/task127-http-check.ts` and `web/verification/task127-http-report.{json,md}` (exact names coordinated with the UI owner), plus disposable fixtures. This covers HTTP SSR/GET/import closure/row and payload bounds without browser ownership or product edits. The UI owner retains interactive browser checks, screenshots and product code. Both evidence sets must identify the tested source and join the final manifest before independent Astra review. HTTP markup inspection is not reported as a real no-JS browser interaction or final end-to-end performance gate.


# Independent implementation review

Astra verified the 55-file freeze and independently ran 22 focused tests (185 expectations), plus browser probes for selection, copy and focus reconciliation. The review initially requested three bounded corrections: Enter must activate enhanced-grid selection checkboxes once; the preset selector must not appear as an inert control before hydration/without JS (native GET facets remain available); theme evidence must assert the resolved theme, because one capture labeled dark was actually light. Product dark mode worked in the independent context. Sol corrected the three cases; Astra approved the exact final freeze after focused browser/code review. Superseded theme artifacts remain explicitly excluded from the 99 valid checks. No findings remain open.
