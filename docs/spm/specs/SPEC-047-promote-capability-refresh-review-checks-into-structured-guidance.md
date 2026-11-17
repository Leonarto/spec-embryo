+++
doc_kind = "spec"
id = "SPEC-047"
title = "Promote capability refresh review checks into structured guidance"
summary = "Expose version-upgrade review checkpoints as shared structured guidance so wrappers can understand what to verify after an SpM refresh without scraping prose."
status = "done"
task_ids = ["TASK-103"]
tags = ["adoption", "agents", "upgrade", "json"]
updated_at = "2026-04-28T15:20:00Z"
+++

# Problem

The upgrade path now exposes typed refresh commands, but it still does not tell JSON-first consumers what to verify after those commands run. Humans can infer the intended checks from the surrounding prose, yet wrappers and downstream tools cannot reliably tell which post-refresh conditions matter without scraping the broader narrative.

That leaves capability refresh only half-structured. If Spec Embryo wants upgrades to be safely automatable, the “what to review after refresh” part needs a shared structured contract too.

# Goals

- Add structured capability-refresh review checks to shared adoption guidance.
- Flow those same review checks into `spm agent brief --json`.
- Keep the existing text-based capability-refresh actions available so the change stays additive for existing consumers.

# Non-Goals

- Do not remove the existing `capabilityRefresh.actions` or `capabilityRefresh.commands` fields in this slice.
- Do not introduce new upgrade commands beyond the current refresh flow.
- Do not redesign unrelated adoption guidance sections.

# Proposed Approach

Add a shared `capabilityRefresh.reviewChecks` field that lists the concrete post-refresh conditions another agent or wrapper should verify after an SpM upgrade. Populate it from one deterministic helper whenever `tool-upgrade-available` is present, then flow it into `doctor --json`, `spm agent brief --json`, and the human-facing adoption renderers so the same review checklist stays aligned everywhere.

# Acceptance Criteria

- Shared adoption guidance exposes structured capability-refresh review checks.
- `spm agent brief --json` includes the same review checks.
- Human-facing adoption outputs and the short agent brief render the same review checklist from one shared field.
- Existing text-based capability-refresh actions and command suggestions remain available for compatibility.
- Tests cover both the structured review-check field and the rendered capability-refresh review sections.
