+++
doc_kind = "spec"
id = "SPEC-052"
title = "Promote Nexus setup flow into structured adoption data"
summary = "Expose the existing Nexus setup flow as shared structured adoption data so wrappers and agents can consume the bounded enablement sequence without scraping prose."
status = "done"
task_ids = ["TASK-108"]
tags = ["adoption", "agents", "nexus", "json"]
updated_at = "2026-04-28T17:18:14.220Z"
+++

# Overview

This slice turns the existing Nexus setup flow into shared structured adoption data. Today those setup steps are rendered in the migration guide, but JSON-first callers cannot reliably consume the bounded enablement sequence without scraping prose.

# Context

Shared adoption guidance already exposes structured doctor modes, workflow-loop commands, memory-workflow commands, source-material hints, tag guidance, Nexus coexistence guidance, capability-refresh review checks, and partial-adoption checks. Nexus setup flow steps are a natural adjacent section that still lives only in renderer prose.

# Goals

- Add structured Nexus setup flow guidance to shared adoption guidance.
- Flow that guidance into `spm agent brief --json`.
- Render the same Nexus setup flow from the shared field in human-facing adoption outputs and the short agent brief.

# Non-Goals

- Do not redesign the actual Nexus setup steps in this slice.
- Do not change Nexus validation logic or `spm nexus setup` behavior.
- Do not restructure unrelated adoption guidance areas.

# Constraints

- Keep the change additive for existing JSON consumers.
- Preserve the current Nexus setup wording and order.
- Reuse the shared adoption guidance model instead of recomputing setup steps in multiple renderers.

# Proposed Approach

Add a `nexusSetup.steps` field to shared adoption guidance and populate it from the existing deterministic helper. Thread that field into `doctor --json`, `spm agent brief --json`, the migration guide, the direct agent brief, and the short human brief so all adoption surfaces stay aligned.

# Detailed Specification

- `AdoptionGuidance` exposes `nexusSetup.steps: string[]`.
- `buildAdoptionGuidance(...)` populates the field from the existing Nexus setup helper.
- `renderMigrationGuideMarkdown(...)` renders `## Nexus Setup Flow` from the shared field.
- `renderDirectAgentBrief(...)` renders a short Nexus setup flow section from the shared field.
- `buildAgentWorkflowBrief(...)` exposes Nexus setup flow guidance in the returned JSON shape.
- `renderAgentWorkflowBrief(...)` renders a “Nexus setup flow” section from that shared field.

# Edge Cases

- Repos that never enable Nexus should still receive the same bounded setup guidance as informative shared data.
- JSON consumers should receive the field even when they never request the long migration guide.
- The change should not affect Nexus behavior itself; this slice only structures the guidance.

# Acceptance Criteria

- Shared adoption guidance exposes structured Nexus setup flow guidance.
- `spm agent brief --json` includes the same setup flow.
- Human-facing migration and brief outputs render Nexus setup flow from that shared field.
- Existing Nexus setup wording and order are preserved.
- Tests cover both structured output and the rendered Nexus setup flow sections.

# Open Questions

- None for this slice; it is an additive structuralization of existing deterministic guidance.
