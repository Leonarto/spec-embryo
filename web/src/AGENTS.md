# AGENTS

This source tree is for the SvelteKit UI layer only.

- Keep route loads thin and deterministic.
- Put project-root or filesystem helpers under `lib/server/`.
- Presentation belongs in Svelte components; source-of-truth logic belongs in the root product code.
- When adding new visual sections, prefer showing whether data is source-derived or deterministically computed.
- Route structure should reinforce the workspace mental model: overview dashboard, tasks, specs, and timeline views with shared layout data.
- Keep the navigation rail compact in spacing but wide enough for labels and icons to avoid truncation or overflow.
- Prefer a shared visual language across routes: muted editorial surfaces, compact metric chips, and Lucide icons used with restraint.
- On desktop, preserve independent vertical scroll containers for the left rail and main content pane so long views do not force whole-page scrolling.
