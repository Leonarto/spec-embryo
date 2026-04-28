+++
doc_kind = "spec"
id = "SPEC-046"
title = "Promote capability refresh guidance into typed command suggestions"
summary = "Expose version-upgrade capability refresh guidance as shared command/reason data so wrappers and renderers can guide SpM refresh flows without scraping prose."
status = "done"
task_ids = ["TASK-102"]
tags = ["adoption", "agents", "upgrade", "json"]
updated_at = "2026-04-28T15:05:49.443Z"
+++

# Problem

The adoption contract already exposes capability refresh guidance when the running CLI is newer than the repo's recorded tool version, but it still does so mostly as a list of prose actions. That is enough for humans reading `doctor --verbose`, yet wrappers and downstream tools still cannot reliably extract the concrete refresh commands and why to use each one without scraping natural language.

That leaves version-upgrade recovery behind the rest of the contract. Doctor modes, workflow loop commands, memory workflow commands, and direct-agent suggestions are already typed; capability refresh should reach the same level so upgraded repos are easier to steer deterministically.

# Goals

- Add typed capability-refresh command suggestions to shared adoption guidance.
- Flow those same suggestions into `spm agent brief --json`.
- Keep the existing text-based capability-refresh actions available so the change stays additive for existing consumers.

# Non-Goals

- Do not remove the existing `capabilityRefresh.actions` text lines in this slice.
- Do not add new upgrade workflows beyond the existing refresh guidance.
- Do not redesign unrelated adoption guidance sections.

# Proposed Approach

Keep the current action lines for compatibility, but add a parallel typed suggestion list for capability-refresh commands in the shared adoption guidance model. Populate it from one deterministic helper when `tool-upgrade-available` is present, then flow it into agent brief JSON and the human renderers so the same `command/reason` pairs stay aligned across adoption artifacts, `doctor --json`, and `spm agent brief --json`.

# Acceptance Criteria

- Shared adoption guidance exposes typed capability-refresh command suggestions.
- `spm agent brief --json` includes the same capability-refresh command suggestions.
- Human-facing adoption outputs and the short agent brief render the same capability-refresh suggestions from one shared field.
- Existing text-based capability-refresh actions remain available for compatibility.
- Tests cover both the structured suggestion field and the rendered capability-refresh suggestion sections.
