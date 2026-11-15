# AGENTS

- `WorkspaceShell.svelte` owns navigation, rail preferences, theme, and active-resource refresh controls.
- Rail width is 56/184 px at root 16; tablet forces compact and mobile uses header navigation.
- `lib/workspace/` owns refresh state, deadlines, validation, and route registration; never use SvelteKit invalidation for this transport.
- Canonical detail pages deliberately do not register refresh before draft-aware support exists.
- Preferences use validated `workspace-preferences.ts`; blocked storage leaves controls usable.
