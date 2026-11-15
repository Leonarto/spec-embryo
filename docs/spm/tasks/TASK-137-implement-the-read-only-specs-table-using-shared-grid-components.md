+++
doc_kind = "task"
id = "TASK-137"
title = "Implement the read-only Specs table using shared grid components"
summary = "Extract the Specs table checkpoint from TASK-129 so it can run in parallel with the inspector, retaining canonical detail links until guarded integration."
status = "done"
spec_ids = ["SPEC-062"]
depends_on = ["TASK-127"]
blocked_by = []
priority = 1
owner_role = "implementation"
created_at = "2026-11-15T21:33:05.494Z"
completed_at = "2026-11-15T22:44:08.655Z"
tags = ["parallel-implementation", "ui"]
updated_at = "2026-11-15T22:44:08.655Z"
+++

# Astra-approved parallel scope

Implement only after TASK-127 is independently approved and committed. Run in parallel with TASK-128 inspector work. Reuse the exact DataTable, ColumnDef, preferences, selection/copy, pager and controls from TASK-127; the existing WorkspaceSpecRow, spec sort keys and progressIsSubset already provide the required data contract. This is an immediate Specs-page consumer, not a second grid or speculative abstraction.

# Ownership

- Sol137: only `web/src/routes/specs/+page.svelte`, new `web/src/lib/components/data-table/spec-columns.ts`, narrowly related tests and its own named verification artifacts.
- Exclude shared query/services/DTO/resource, generic DataTable, layout/inspector host, canonical details and question action. TASK-128 must not edit the Specs list page while this task owns it.
- Coordinate a genuine shared-helper defect through one owner and a reviewed serial patch; never edit the same file concurrently. Otherwise defer integration-specific changes to TASK-129.
- Root owns managed memory and shared guide edits. Browser lease is shared and handed off explicitly after closing the owning browser.

# Behavior

Specs opens a table. Fixed selection/ID/title, canonical spec status, done/total, blocked, review and linked-task count; optional owner/updated/tags use existing DTO fields. Existing taskScope=all means global progress; other taskScope/window filters label subset progress explicitly. Spec archived status is independent from linked-task scope. No document parsing or question-count expansion. No Cards alternative is required; only Tasks retains Board.

Use project+spec-kind preferences, stable ID selection limited to the page, same copy/formula safeguards, sort/query/filter/paging behavior, keyboard grid and simple/SSR fallback. Preserve current typed/unsubmitted filter behavior through refresh. Identity links remain canonical; omit onInspect until TASK-129 consumes the completed inspector. No question editing or drawer guards here.

# Gate

Relevant component reuse tests and Specs-specific projection/sort/archive/subset selection checks; real browser keyboard/copy/columns and refresh smoke, direct URL/GET/no-JS/simple behavior, 0/1/200 fixture cases, layout light/dark and contrast in the approved sizes. Do not rerun every TASK-127 generic-grid check when source is unchanged; test the new consumer and document reused evidence. Run check/build, scoped tests/AGENTS, freeze hashes and independent Astra review. Commit before TASK-129 integrates it. TASK-129 depends on TASK-128 and TASK-137.

# Verification record

Implemented and independently approved by Astra with no open findings. Final 25-file freeze matched every hash; the two product files match the isolated c32be17 snapshot. Six independent tests pass with 85 expectations. Evidence includes 53 browser checks with explicitly recorded source versions, 12 HTTP/import/immutability checks, 100-row JSON of 41669 bytes and 800 unchanged fixture documents. Check/build pass; AGENTS passes. Report: web/verification/task137-report.md. The shared prerequisites were separately approved/committed as c546f10 (controlled taskScope) and c32be17 (activation/Escape). Inspector URL-adapter adoption and questions remain TASK-128/129, not claimed here.


# Serialized shared-helper prerequisite (Astra)

Preflight found that AnalysisFilters removes controlledNames, then unconditionally re-adds taskScope for Specs. This is not a defect in TASK-127's current consumer. After the TASK-127 commit, allow one minimal exception to this task's ownership: insert taskScope only when route is specs AND controlledNames does not include taskScope. The new Specs selector associates with the same GET form and lists taskScope in controlledNames; do not create a parallel form or duplicate values.

Root will serialize this tiny helper patch and its focused test as the first reviewed/committed checkpoint of TASK-137 before TASK-128 modifies the same helper for inspector reset identity. TASK-128 may work elsewhere during that reservation. After the helper checkpoint, shared ownership returns to TASK-128; TASK-137 continues its own page/descriptor. Final integration must verify FormData.getAll(taskScope) contains exactly one value, all/unarchived/archived transitions reset page1 and preserve other facets, with JavaScript and without it.


# Shared dropdown activation defect found during integration

# Shared dropdown dismissal fix discovered during137

Approve a serialized H137 patch of SelectDropdown.svelte and MultiSelectDropdown.svelte plus focused browser regression/evidence. Replace their window pointerdown outside handler with bubbling click (MouseEvent); retain the open/contains guard, Escape handling and focus restoration. Do not preventDefault, stopPropagation, synthesize clicks, add delayed-submit workarounds or auto-close on an inside option selection.

Cause verified in source: AnalysisFilters.compact makes dropdown-panel position:static. Closing it on pointerdown collapses layout and moves Apply between down and up, so the first click is lost. Waiting until click means the browser has determined the activated target; the default form submission is still allowed, and hidden successful controls retain their form association. It also supports keyboard-generated activation. Pointer cancellation/scrolling alone should not dismiss.

Do not edit AnalysisFilters, form serialization or query contracts;128 owns its current changes. The exterior Popover remains unchanged: its positioned panel does not cause this inline collapse and no separate defect has been reproduced. Root serializes the two-component patch/review/commit; no concurrent UI128 edits to them.

Regression: real first mouse click Apply after selecting a value with each inline dropdown still open; exactly one submit/navigation and correct query value, not a second-click workaround. Cover Specs taskScope and Tasks status/lifecycle, keyboard radio/checkbox plus Apply, Escape inner dropdown returning to its summary without closing parent, outside click closing while its target action fires exactly once, touch first-tap Apply, and scroll/pointercancel without premature closure. Use real pointer/keyboard activation rather than force click or dispatchEvent to hide movement. Preserve no-JS GET behavior. Report the reproduced pre-fix failure honestly as a shared bug found in137; earlier127 review does not make the failure a pass.

## Follow-up repro: nested Escape ordering

An actual Tasks127 snapshot repro found first Escape from Archive scope closing Filters parent, leaving the inner details open but hidden. This is a separate confirmed shared bug: all three keydown handlers were on window, so registration order could close the parent and move focus before the child ran.

Explicitly expand H137 ownership to Popover.svelte for Escape only. Move the keydown handler from window onto each component's own details element in SelectDropdown, MultiSelectDropdown and Popover, in bubbling phase. Keep defaultPrevented checks and preventDefault when a component closes/restores its own summary. Do not stopPropagation or depend on global listener registration order; do not use a broad query for arbitrary open details. A native listener action with cleanup is equivalent if needed for compiler/a11y constraints; do not add an artificial role merely to silence a warning.

First Escape closes only the focused inner dropdown and restores its summary, keeping Filters open; second Escape closes Filters and restores its trigger. Draft selections stay intact. Verify both select/multi, defaultPrevented observed by a later host-bubble listener, and retain first-click/touch regressions. The outside-click change in the two dropdowns remains; Popover's outside handler is unchanged without another repro. AnalysisFilters and inspector source are excluded from H ownership.

UI128 has been notified: host Escape must be bubbling and honor defaultPrevented, never a capture listener that runs before popup handling. Its integration gate covers inner popup→parent popup→inspector on consecutive Escapes in docked/modal modes;129 adds dirty confirmation through the central host transition.


The shared patch is independently approved and committed: outside click preserves activation in SelectDropdown/MultiSelectDropdown, and local bubbling Escape handlers with cleanup in those controls plus Popover close the inner layer first. The isolated snapshot contains only the three widgets on c546f10, not Specs137 or inspector128. Browser 31/31 checks pass, including real touch scroll/pointercancel; independent client/server compilation has zero warnings and SSR/FormData tests pass 2/38. All seven frozen hashes match. Evidence is web/verification/dropdown-dismissal-report.md with red/green JSON and web/scripts/dropdown-dismissal-check.mjs. Specs consumer and inspector integration retain their own gates.


The final staged whitespace check removed one extra trailing LF from the verification script after execution. Astra verified the exact one-byte delta and all 25 final hashes; approval remains valid. Historical provenance retains the hash actually executed rather than inventing a rerun.
