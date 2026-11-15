# AGENTS

SvelteKit presentation layer.

- Keep filesystem/project-root helpers in `lib/server/`; detail loads reuse root detail services.
- Routes are Overview, Tasks, Specs, and Timeline; canonical spec/task detail URLs remain useful without JavaScript.
- Shell composition lives in `lib/components/workspace/`; route headings use `ViewToolbar`.
- Overview alone owns cross-cutting focus, counts, AGENTS health, git, handoff, and execution signals.
- Keep independent navigation/content scrolling on desktop and local horizontal scrolling for wide data surfaces.
- Timeline grouping and dependency tracing remain deterministic and URL-driven.
- Route styles consume `app.css` semantic tokens; keep serif typography confined to branding and Overview editorial titles.
