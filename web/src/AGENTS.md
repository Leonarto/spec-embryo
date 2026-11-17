# AGENTS

SvelteKit presentation layer.

- Hooks select registered roots per request. Layout loads shell/registry metadata; `lib/server/workspace.ts` shares canonical source through locals, including details.
- Routes include Overview, Tasks, Specs, Timeline and Repositories. Canonical missing details return404; native forms/links preserve project identity.
- Shell composition lives in `lib/components/workspace/`; route headings use `ViewToolbar`.
- Overview alone owns cross-cutting focus, counts, AGENTS health, git, handoff, and execution signals.
- Keep independent navigation/content scrolling on desktop and local horizontal scrolling for wide data surfaces.
- Timeline grouping and dependency tracing remain deterministic and URL-driven.
- Route styles consume `app.css` semantic tokens; keep serif typography confined to branding and Overview editorial titles.
