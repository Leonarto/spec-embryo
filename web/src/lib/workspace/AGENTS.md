# AGENTS

- `resource.ts` controls active-route refresh with sequence/generation ownership, abort, deadline, and snapshot validation. Preserve the prior snapshot on failures.
- Svelte adapters register one route resource with the shell. Canonical detail pages do not register until draft-aware refresh exists.
- Do not refresh through SvelteKit invalidation/navigation or mutate page data. SSR and fetch share root route projectors.
