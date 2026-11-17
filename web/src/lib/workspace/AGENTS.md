# AGENTS

- `resource.ts` controls active-route refresh with sequence/generation ownership, abort, deadline, and snapshot validation. Preserve the prior snapshot on failures.
- Svelte adapters register one route resource. Inspector-only URLs retarget it without reseeding/cancelling; real list navigation accepts fresh SSR data.
- `workspaceURL()` observes Kit state/route signals but reads browser location for shallow URLs; SSR never reads window.
- Context combines manual list/inspector refresh with separate results/errors. Canonical detail pages remain unregistered.
- Do not refresh through SvelteKit invalidation/navigation or mutate page data. SSR and fetch share root route projectors.
