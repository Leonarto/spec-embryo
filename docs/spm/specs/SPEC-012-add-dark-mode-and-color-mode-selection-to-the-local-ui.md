+++
doc_kind = "spec"
id = "SPEC-012"
title = "Add dark mode and color mode selection to the local UI"
summary = "Define theme support for the local workspace, including a color-mode selector and a default dark presentation."
status = "active"
task_ids = ["TASK-035", "TASK-036", "TASK-037"]
tags = ["ui", "theme", "dark-mode"]
updated_at = "2026-04-04T02:38:25.985Z"
+++

# Problem


The local UI currently ships in a light theme only. That creates three product issues:

- users who primarily work in dark environments get a visually inconsistent experience
- the current visual system is not theme-aware, so future UI work risks hardcoding light-only color decisions
- there is no durable user-controlled theme preference in the workspace

The first version of theme support should make dark mode a first-class experience rather than a fallback skin.

# Overview


Add a color-mode system to the SvelteKit workspace with:

- a visible color-mode selector in the UI
- `system` as the default selection when it can be resolved, with fallback to dark when it cannot
- deterministic theme tokens that can be reused across views and shared components
- persistence of the selected mode so the workspace does not reset on every reload

# Goals


- Add a user-facing color-mode selector to the local UI.
- Make the initial theme selection prefer `system`, while resolving to dark if system theme detection is unavailable.
- Refactor the current theme variables so the workspace can render cleanly in both dark and light modes.
- Ensure the main workspace surfaces remain legible and intentionally designed in both modes.
- Keep theme switching local-first and deterministic.

# Non-Goals


- No server-side user profiles or shared remote theme preferences.
- No full design-system rewrite beyond what is needed to support both themes cleanly.
- No per-view or per-panel custom themes.
- No automatic theme generation from arbitrary palettes in this slice.

# Constraints


- The existing UI should remain professional and deliberate in both modes rather than looking like an inverted afterthought.
- The selector should be available from inside the workspace shell, not hidden in browser settings.
- Theme state should not require any external backend.
- Existing Mermaid/code/detail surfaces should continue to render coherently after theme support is introduced.

# Proposed Approach


1. Introduce explicit light and dark design tokens in the shared app styles.
2. Apply theme state at the app-shell level so all routes inherit the same mode.
3. Add a compact color-mode control near the bottom of the persistent left sidebar.
4. Persist the chosen mode locally in the browser.
5. Default the workspace to `system` when no preference has been saved yet, and resolve missing system support to dark.
6. Audit the current views and shared components for theme-sensitive surfaces:
   - shell and navigation
   - dashboard cards and metrics
   - task/spec/timeline surfaces
   - detail views
   - Mermaid diagrams and code blocks

# Detailed Specification

## Theme model


The workspace should support at least:

- `system`
- `dark`
- `light`

## Persistence


Theme preference should be stored client-side so the selected mode survives refreshes and future `spm ui` sessions in the same browser profile.

## Default behavior


If no saved preference exists, the UI should default to `system`. If the browser or runtime cannot supply a system preference cleanly, the resolved theme should fall back to dark.

## Selector behavior


The selector should:

- show the currently active mode
- switch themes immediately without full-page reload
- be available from the persistent workspace shell near the bottom of the left sidebar
- allow explicit switching among `system`, `dark`, and `light`

## Theme coverage


The mode switch is not complete unless it covers:

- app background and atmospheric layers
- panel surfaces and borders
- text hierarchy
- badges, pills, and controls
- code blocks
- Mermaid diagram containers and Mermaid theme variables so diagrams can render as real dark-mode diagrams rather than light paper islands

# Edge Cases


- A theme saved in one browser should not be assumed to exist in another browser.
- `system` mode needs a clear resolution path both at initial load time and after the user toggles it manually.
- Mermaid diagrams need explicit dark-theme overrides so dark mode does not reduce contrast or leave diagrams visually disconnected from the rest of the UI.
- Some components may need mode-specific glow, border, and shadow tuning instead of simple color inversion.
- The first rendered frame should avoid a harsh flash from light-to-dark or dark-to-light if possible.

# Acceptance Criteria


- A visible color-mode selector exists in the workspace shell.
- The selector is available near the bottom of the left sidebar.
- The workspace defaults to `system` when no preference has been saved, and resolves to dark if system theme detection is unavailable.
- Selecting a mode updates the UI immediately.
- The selected mode persists across reloads.
- Main workspace views remain readable and visually intentional in both dark and light modes.
- Shared detail surfaces, code blocks, and Mermaid containers still look coherent after the theme change.
- Mermaid diagrams render with a true dark-mode treatment when the active theme resolves to dark.

## Resolved Decisions

- Question: Should the first version expose only `dark` and `light`, or also `system`?
  Answer:
    let's default to system, and if you cannot pick the system default to dark.

- Question: Should the selector live in the top bar, the left nav, or another persistent chrome position?
  Answer:
    bottom of left side bar.

- Question: Should Mermaid diagrams switch to a fully dark-specific Mermaid theme, or should the container stay dark while diagram internals keep a lighter paper-like surface?
  Answer:
    YES, dark theme for mermaid.
