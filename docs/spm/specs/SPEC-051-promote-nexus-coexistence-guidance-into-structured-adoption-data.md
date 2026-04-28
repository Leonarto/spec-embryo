+++
doc_kind = "spec"
id = "SPEC-051"
title = "Promote Nexus coexistence guidance into structured adoption data"
summary = "Expose the existing Nexus coexistence guidance as shared structured adoption data so wrappers and agents can consume the bounded coexistence contract without scraping prose."
status = "done"
task_ids = ["TASK-107"]
tags = ["adoption", "agents", "nexus", "json"]
updated_at = "2026-04-28T17:00:00Z"
+++

# Overview

This slice turns the existing Nexus coexistence guidance into shared structured adoption data. Today those rules are rendered in the migration guide and direct agent brief, but JSON-first callers cannot reliably consume the bounded coexistence contract without scraping prose.

# Context

Shared adoption guidance already exposes structured doctor modes, workflow-loop commands, memory-workflow commands, source-material hints, tag guidance, capability-refresh review checks, and partial-adoption checks. Nexus coexistence rules are another stable deterministic section that still lives only in renderer prose.

# Goals

- Add structured Nexus coexistence guidance to shared adoption guidance.
- Flow that guidance into `spm agent brief --json`.
- Render the same Nexus coexistence guidance from the shared field in human-facing adoption outputs and the short agent brief.

# Non-Goals

- Do not redesign the Nexus setup flow steps in this slice.
- Do not change bounded Nexus behavior or doctor validations.
- Do not restructure unrelated adoption guidance areas.

# Constraints

- Keep the change additive for existing JSON consumers.
- Preserve the current Nexus coexistence wording and order.
- Reuse the shared adoption guidance model instead of recomputing the coexistence lines in multiple renderers.

# Proposed Approach

Add a `nexusCoexistence` field to shared adoption guidance and populate it from the existing deterministic helper. Thread that field into `doctor --json`, `spm agent brief --json`, the migration guide, the direct agent brief, and the short human brief so all adoption surfaces stay aligned.

# Detailed Specification

- `AdoptionGuidance` exposes `nexusCoexistence.lines: string[]`.
- `buildAdoptionGuidance(...)` populates the field from the existing Nexus coexistence helper.
- `renderMigrationGuideMarkdown(...)` renders `## Nexus Coexistence` from the shared field.
- `renderDirectAgentBrief(...)` renders Nexus coexistence lines from the shared field instead of calling the helper locally.
- `buildAgentWorkflowBrief(...)` exposes Nexus coexistence guidance in the returned JSON shape.
- `renderAgentWorkflowBrief(...)` renders a “Nexus coexistence” section from that shared field.

# Edge Cases

- Repos that never enable Nexus should still receive the same bounded coexistence guidance as informative shared data.
- JSON consumers should receive the field even when they never request the long migration guide.
- The change should not affect Nexus validation logic itself; this slice only structures the guidance.

# Acceptance Criteria

- Shared adoption guidance exposes structured Nexus coexistence guidance.
- `spm agent brief --json` includes the same coexistence guidance.
- Human-facing migration and brief outputs render Nexus coexistence guidance from that shared field.
- Existing Nexus coexistence wording and order are preserved.
- Tests cover both structured output and the rendered Nexus coexistence sections.

# Open Questions

- None for this slice; it is an additive structuralization of existing deterministic guidance.
