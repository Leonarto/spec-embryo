+++
doc_kind = "task"
id = "TASK-135"
title = "Extract reusable canonical detail views for inspector integration"
summary = "Prepare TASK-128 by extracting existing task/spec detail content with immediate canonical-page consumers, in parallel with the Tasks table."
status = "in_progress"
spec_ids = ["SPEC-062"]
depends_on = ["TASK-126"]
blocked_by = []
priority = 1
owner_role = "implementation"
created_at = "2026-11-15T20:18:45.780Z"
tags = ["parallel-implementation", "ui"]
updated_at = "2026-11-15T20:44:44.220Z"
+++

# Astra-approved extraction scope

# Astra decision — safe parallel detail extraction

**Recommendation: yes, a small extraction slice is worthwhile after126 and134 commits.** It gives the available Sol an independent consumer-backed task while the UI Sol implements127. Do not parallelize inspector integration, URL/history/focus state or question-draft behavior yet.

## Dependency/gates

Root may create one prep task under SPEC062 depending on126, called “Extract canonical detail presentation”. It is a refactor checkpoint, not completion/start of TASK128. TASK128 still waits for127 approval+commit and this extraction's separate approval+commit. TASK129's draft protection/conflict handling remains unchanged. No unreviewed partial component branch should be consumed by127/128.

## Exclusive ownership

- Extraction Sol: web/src/routes/tasks/[taskId]/+page.svelte; web/src/routes/specs/[specId]/+page.svelte; new web/src/lib/components/detail/** including localAGENTS and narrowly needed presentation types; own evidence/tests files explicitly named in its manifest.
- UI127 Sol: Tasks list route, data-table/**, list filters/query integration, selection/copy/preferences/pager and its own evidence. It must not edit canonical detail routes or new detail/** until the extraction commit.
- Root: shared README/architecture/AGENTS entries and managed memory, using proposed wording from authors. Avoid concurrent edits to lib/AGENTS or shared reports. No storage/engine/domain/DTO/service/server-loader/action/endpoint/app.css changes in the extraction slice. Existing DocumentBody/Mermaid components remain reused, not forked or rewritten.

## Exact deliverable and contract

Move existing canonical detail presentation into TaskDetail and SpecDetail components consumed immediately by their canonical pages. Pages retain data/form adaptation and document title; components accept existing TaskDetailResult/SpecDetailResult plus the existing spec action result. Do not pass all page.data, fetch internally or derive domain metrics. Preserve found:false rendering, canonical entity links, current section ordering, existing semantic headings and displayed values.

A SpecQuestions extraction is allowed because it is a coherent complex form block already consumed by SpecDetail. Its contract passes current question list, spec identity, action result and canonical question-action URL; it performs the existing ordinary POST, with the same field names, errors, saved count and evaluation display. No new endpoint, local persistence, enhancement state machine, navigation guard or drawer form behavior here. Keep HTTP200 legacy missing GET until128's explicit404 change. Preserve existing styles while moving them locally; no opportunistic visual redesign/contrast work in this mechanical slice.

Do not add presentation=panel branches, unused inspector primitives or unconsumed callbacks “for later”. TASK128 adds the actual panel layout and link interception against these typed components once the canonical consumers are verified. This keeps the extraction useful even if inspector integration changes.

## Validation/review

web:check and relevant rendering/route tests; before/after canonical task/spec screenshots at desktop/mobile on the same fixture; missing entity view; long document/Mermaid behavior; real ordinary no-JS question POST success/error/evaluation in a disposable fixture, restored afterward. Verify lists' initial bundles do not import detail/Mermaid as a side effect. No need to repeat heavy graph/volume suites.

Each Sol freezes its own manifest. Astra reviews and root commits each slice independently, without staging the other's work. Browser is a single coordinated lease: extraction work can proceed with source/SSR checks while UI127 owns it, then get an explicit closed-browser handoff for its frozen visual/form review. Separate fixture/dev port alone does not solve the shared browser profile lock.

If changes beyond the above are necessary, stop that expansion and ask Astra/root for an ownership decision; do not silently absorb128 or129. The task can run in parallel without bypassing their gates.


# Verification record

Pending implementation.
