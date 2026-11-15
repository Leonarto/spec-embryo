# AGENTS

Shared UI helpers and components.

- Create reusable presentation here; domain parsing and derivations belong in root services.
- `theme.ts` resolves color modes; `workspace-preferences.ts` validates versioned rail preferences and parent route matching.
- `components/IconButton.svelte` requires a label; `ViewToolbar.svelte` aligns route titles/counts.
- Dropdowns are anchored overlays and must not reflow their surroundings.
- Detail presentation and analytical controls stay shared across entity types/routes.
- `DocumentBody` renders root-parsed blocks; Mermaid is a view enhancement with tested token mapping in `mermaid-theme.ts`.
- `workspace/` controls refresh ownership and shell registration; canonical detail pages stay unregistered until draft-aware support. Keep snapshots immutable and commit shell/data atomically.
- `AnalysisFilters` accepts narrow filter DTOs. `SpecOptionsPicker` owns separate cancellable option requests; GET forms and page links work without JS.
- `ListPager` links start from effective pagination; refresh preserves requested URL and announces unavailable pages/filters.
- Filter drafts reset on URL/Clear epochs, never refresh. Pickers separate typed search from the last submitted query and refresh that catalog under request ownership.
