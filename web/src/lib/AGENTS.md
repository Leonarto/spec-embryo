# AGENTS

Shared UI helpers and components.

- Create reusable presentation here; domain parsing and derivations belong in root services.
- `theme.ts` resolves color modes; `workspace-preferences.ts` validates versioned rail preferences and parent route matching.
- IconButton requires a label; ViewToolbar aligns titles/counts. Dropdown overlays never reflow content.
- `components/detail/` owns shared readers and persistent SpecQuestions; routes retain the sole canonical POST.
- `DocumentBody` renders root-parsed blocks; Mermaid is a view enhancement with tested token mapping in `mermaid-theme.ts`.
- `inspector/` owns host, leave guard, verified history and session seed fence; docking preserves content.
- `workspace/` owns shell/list refresh; canonical detail readers own atomic snapshots and draft-aware refresh. Keep accepted data immutable.
- `AnalysisFilters` accepts narrow filter DTOs. `SpecOptionsPicker` owns separate cancellable option requests; GET forms and page links work without JS.
- `components/data-table/` owns bounded grids; column descriptors supply sort/copy values. Spec status is independent from progress.
- `components/timeline/` owns relative units and logical-window focus; root services derive placement/transport.
- `ListPager` links start from effective pagination; refresh preserves requested URL and announces unavailable pages/filters.
- Filter drafts reset on URL/Clear epochs, never refresh. Pickers separate typed search from the last submitted query and refresh that catalog under request ownership.
