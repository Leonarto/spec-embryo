+++
doc_kind = "task"
id = "TASK-137"
title = "Implement the read-only Specs table using shared grid components"
summary = "Extract the Specs table checkpoint from TASK-129 so it can run in parallel with the inspector, retaining canonical detail links until guarded integration."
status = "todo"
spec_ids = ["SPEC-062"]
depends_on = ["TASK-127"]
blocked_by = []
priority = 1
owner_role = "implementation"
created_at = "2026-11-15T21:33:05.494Z"
tags = ["parallel-implementation", "ui"]
updated_at = "2026-11-15T21:33:05.494Z"
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

Pending implementation.


# Serialized shared-helper prerequisite (Astra)

Preflight found that AnalysisFilters removes controlledNames, then unconditionally re-adds taskScope for Specs. This is not a defect in TASK-127's current consumer. After the TASK-127 commit, allow one minimal exception to this task's ownership: insert taskScope only when route is specs AND controlledNames does not include taskScope. The new Specs selector associates with the same GET form and lists taskScope in controlledNames; do not create a parallel form or duplicate values.

Root will serialize this tiny helper patch and its focused test as the first reviewed/committed checkpoint of TASK-137 before TASK-128 modifies the same helper for inspector reset identity. TASK-128 may work elsewhere during that reservation. After the helper checkpoint, shared ownership returns to TASK-128; TASK-137 continues its own page/descriptor. Final integration must verify FormData.getAll(taskScope) contains exactly one value, all/unarchived/archived transitions reset page1 and preserve other facets, with JavaScript and without it.
