# AGENTS

Shared UI helpers and components.

- Create reusable presentation here; domain parsing and derivations belong in root services.
- `theme.ts` resolves color modes; `workspace-preferences.ts` validates versioned rail preferences and parent route matching.
- `components/IconButton.svelte` requires a label; `ViewToolbar.svelte` aligns route titles/counts.
- Dropdowns are anchored overlays and must not reflow their surroundings.
- Detail presentation and analytical controls stay shared across entity types/routes.
- `DocumentBody` renders root-parsed blocks; Mermaid is a view enhancement with tested token mapping in `mermaid-theme.ts`.
