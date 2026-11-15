# AGENTS

SvelteKit presentation layer.

- `+layout.server.ts` loads shell only; page loads call root workspace projectors. `lib/server/workspace.ts` shares one in-flight canonical source via request locals, including detail loads.
- Routes are Overview, Tasks, Specs, and Timeline; canonical missing details return404, and SSR inspection stays readable without JavaScript.
- Shell composition lives in `lib/components/workspace/`; route headings use `ViewToolbar`.
- Overview alone owns cross-cutting focus, counts, AGENTS health, git, handoff, and execution signals.
- Keep independent navigation/content scrolling on desktop and local horizontal scrolling for wide data surfaces.
- Timeline grouping and dependency tracing remain deterministic and URL-driven.
- Route styles consume `app.css` semantic tokens; keep serif typography confined to branding and Overview editorial titles.
