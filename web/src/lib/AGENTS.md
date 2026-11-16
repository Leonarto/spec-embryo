# AGENTS

Shared UI helpers and components.

- Create reusable presentation here; domain parsing and derivations belong in root services.
- `theme.ts` resolves color modes; `workspace-preferences.ts` validates versioned rail preferences and parent route matching.
- `components/IconButton.svelte` requires a label; `ViewToolbar.svelte` aligns route titles/counts.
- Dropdowns are anchored overlays and must not reflow their surroundings.
- `components/detail/` shares canonical/inspector rendering; routes retain canonical question actions.
- `DocumentBody` renders root-parsed blocks; Mermaid is a view enhancement with tested token mapping in `mermaid-theme.ts`.
- `inspector/` owns persistent host, identity transport and verified history; docking never recreates its content.
- `workspace/` owns shell/list refresh; canonical detail readers own atomic snapshots and draft-aware refresh. Keep accepted data immutable.
- `AnalysisFilters` accepts narrow filter DTOs. `SpecOptionsPicker` owns separate cancellable option requests; GET forms and page links work without JS.
- `components/data-table/` owns generic bounded-page grid mechanics; `task-columns`/`spec-columns` supply sort/copy values; Spec status stays independent from progress.
- `ListPager` links start from effective pagination; refresh preserves requested URL and announces unavailable pages/filters.
- Filter drafts reset on URL/Clear epochs, never refresh. Pickers separate typed search from the last submitted query and refresh that catalog under request ownership.
