# TASK-137 — read-only Specs table

Specs now consumes the same DataTable, column/preferences controls, page-local selection, safe clipboard and pager as Tasks. The only product files are `routes/specs/+page.svelte` and `components/data-table/spec-columns.ts`. Existing service DTOs, query/resource implementations, generic grid, canonical details and question action are unchanged by this consumer. Identity links stay canonical; no onInspect, drawer, new Cards mode or question editor is introduced.

Fixed/default columns are selection, ID/title, canonical spec status, done/total, blocked, review and linked-task count. Owner, updated and tags are optional. Done/total uses existing linkedTaskCount and progress fields; sorting uses existing server keys. Preferences are project+spec-specific. Spec archived status remains independent of linked-task taskScope. Global progress is default; taskScope/window subsets are explicitly labeled.

## Verification versions

The consumer's two product files have identical hashes throughout these checks. [Core](task137/core.json), [refresh](task137/refresh.json), [no-JS](task137/nojs.json) and [layout/contrast](task137/layouts.json) use isolated `c546f10` plus the two consumer files. They remain valid: later serialized `c32be17` changes only shared dismissal/Escape events, with separate reviewed regression evidence. [Final JS filters](task137/filters.json), [HTTP/build imports](task137/http.json), check/build and final focused tests use isolated **c32be17 plus these consumer files**, excluding all unreviewed TASK-128 sources. No workspace URL adapter from128 is consumed.

The shared first-click Apply and nested Escape findings were fixed and independently approved in checkpoint c32be17. TASK-137's own final Apply check then passed with real first clicks, not a double click or forced click. QA locator/waiter mistakes were corrected before collecting final phase reports; they did not require consumer source changes.

## Results

- **53 browser checks passed:** 10 core, 10 final filters, 2 refresh, 15 real JavaScript-disabled/simple checks and 16 layout/contrast checks. Evidence contains browser version, capture time, source hashes and base commit.
- Core checks cover 200 bounded rows,0/1 filtered result states, F6/arrows, formula-safe spec title/row copy, optional Owner preference persistence, project+spec storage and canonical Enter navigation.
- Final JS filter checks cover all/unarchived/archived, exactly one successful taskScope value, page 1, preserved status/sort/pageSize and explicit global/subset/window labels. The actual canonical spec remains Archived while its linked progress changes1/3→0/2→1/1.
- A real context with `javaScriptEnabled:false` verifies the single GET form, three taskScope choices, page 1 and other facets, native table, native sort and canonical identity links. `simple=1` remains a native table even after JavaScript mounts. These are browser checks, not HTTP-only inferences.
- Same-query refresh preserves a selected spec ID and focused row/column; an unsubmitted taskScope radio draft survives. It uses a gated synthetic HTTP response, never document mutation. Shared refresh/clipboard/grid mechanics retain TASK-127's broader reviewed evidence; the full generic matrix is not repeated here.
- **12 HTTP/import checks passed:**0/1/200 rows match SSR and JSON; no-store JSON, no document bodies/foreign-view arrays, native SSR table.100-row JSON is **41,669 bytes**, below 250 KiB;200-row JSON is 78,649 bytes. Production Specs static import closure excludes DocumentBody, canonical detail nodes and Mermaid. All 800 fixture documents remained byte-identical across HTTP reads.0/1 represent filtered states of the200-spec fixture, not separate physical datasets.
- Isolated `bun run web:check`: zero errors/warnings. `bun run --cwd web build`: passed. `bun test tests/spec-table.test.ts tests/spec-filter-form.test.ts`: **6 passed, 0 failed, 85 assertions**. Initial integration also ran unchanged generic-grid tests: 14 passed/135 assertions across 3 files. No final global coverage claim is made by this Svelte consumer checkpoint; full integration remains TASK-131.

## Actual captures and contrast

The disposable fixture has 200 specs, 600 linked tasks, all canonical spec statuses, an intentionally long/formula-prefixed title, optional metadata, archived completed tasks and open questions only on the unchanged canonical detail. The table does not parse those bodies.

| Viewport | Light | Dark | Visible complete rows |
| --- | --- | --- | ---: |
|1280×720|[capture](task137/task137-specs-light-1280.png)|[capture](task137/task137-specs-dark-1280.png)|14|
|1440×900|[capture](task137/task137-specs-light-1440.png)|[capture](task137/task137-specs-dark-1440.png)|19|
|1920×1080|[capture](task137/task137-specs-light-1920.png)|[capture](task137/task137-specs-dark-1920.png)|25|
|390×844|[capture](task137/task137-specs-light-390.png)|[capture](task137/task137-specs-dark-390.png)|16|

No document-level horizontal overflow occurred; table rows were 32px in these mouse-pointer captures. The same solid-surface text audit used for TASK-127 checked 1,640 text nodes per view/theme with zero failures and zero unsupported backgrounds/skips. It excludes SVG and closed details, checks resolved text/background colors against 4.5:1 (3:1 for large text), and is not a complete accessibility certification. Generic coarse-pointer controls are unchanged; touch event regression is separately recorded in c32be17's shared checkpoint. Astra approved the first 1440×900 composition as the intended direction; that was an early visual review, not the final gate.

## Reproduction and limits

`web/scripts/spec-table-check.mjs` exports `verifySpecTable(page,{baseURL,phase,evidenceDir})` for the five recorded browser phases. `web/scripts/spec-table-http-check.ts <origin> <built-source-root> <fixture-root> <report.json>` records read-only HTTP, byte stability and production import checks. The focused test fixture is defined in `tests/spec-table.test.ts`. Sync/check precedes SSR testing on a clean snapshot.

Source/test isolation: `/private/tmp/spm-task137-final` is `git archive c32be17` plus only the two product files and focused test, with existing dependency directories linked; no install/network dependency was added. Runtime preview used a disposable synthetic project, never managed repo data. Browser was closed and its lease returned after each coordinated window. Final integration must consume the separately reviewed inspector128, then TASK-129 adds guarded Specs inspection/questions; neither is claimed complete here.
