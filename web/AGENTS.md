# AGENTS

This folder contains the local SvelteKit workspace for Spec Embryo.

- Keep the web app read-only until the product explicitly supports UI-side mutations.
- Treat the root `src/` deterministic services as the single data source; do not re-parse repo docs in the web app.
- Prefer server-side loading for repo state so the dashboard always reflects the local files.
- Preserve the intentional editorial-operations visual direction; avoid generic dashboard styling.
- The shell should stay a compact but readable left rail plus focused views rather than drifting back into one overloaded page.
- Keep the overview dashboard as the home for general signals, stats, AGENTS health, and cross-cutting context that does not belong inside Tasks, Specs, or Timeline.
- The timeline view now aims for a dense split-pane planning surface rather than large card rows; preserve grouping and scanability when iterating on it.
- Use iconography deliberately and consistently. The current icon layer is `@lucide/svelte`, chosen to align with shadcn-svelte's recommended icon path without forcing a Tailwind rewrite.
- `spm ui` must work both in local repo dev and from the globally installed npm package, so Vite filesystem allow rules should stay compatible with packaged dependency roots under Bun/npm global `node_modules`.
- If the web app gains multiple pages or richer local state, add nested `AGENTS.md` files before the folder sprawls.
