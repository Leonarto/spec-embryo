# AGENTS

This source tree is for the SvelteKit UI layer only.

- Keep route loads thin and deterministic.
- Put project-root or filesystem helpers under `lib/server/`.
- Presentation belongs in Svelte components; source-of-truth logic belongs in the root product code.
- Route structure should reinforce the workspace mental model: overview dashboard, tasks, specs, and timeline views with shared layout data.
- Detail routes for individual specs and tasks should reuse the shared deterministic detail service instead of teaching each page how to inspect repo docs.
- Spec detail mutations should submit small deterministic forms to server actions and let the root product layer own file rewrites plus continuation guidance.
- The timeline route should stay grouped and dense, with compact metadata on the left and deterministic bars on the right instead of drifting back to card-like rows.
- Timeline selection should stay URL-driven and linkable, not trapped in route-local ephemeral state.
- Keep the navigation rail compact in spacing but wide enough for labels and icons to avoid truncation or overflow.
- Keep the visual language consistent across routes.
- Preserve independent left-rail and main-pane scrolling on desktop.
