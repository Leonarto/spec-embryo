# AGENTS

This folder contains reusable deterministic product services.

- Services should encapsulate cross-command logic that is still product behavior, not one-off scripting.
- Keep them side-effect light and easy to call from commands, scripts, and later server mode.
- If a maintenance script becomes part of the product workflow, move its core logic here and let the script be a thin wrapper.
- If the local dashboard needs derived data, shape it here so the web app stays a presentation layer over shared deterministic services.
- Workflow-specific board columns or visual groupings should be modeled here as deterministic projections over the underlying repo statuses, not as a second state system.
- Section-aware spec helpers such as open-question parsing or resolved-decision extraction belong here, not inside route files or ad hoc Markdown string handling in the UI.
