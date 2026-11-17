+++
doc_kind = "spec"
id = "SPEC-050"
title = "Promote tag guidance into structured adoption guidance"
summary = "Expose the existing tag-handling guidance as shared structured adoption data so wrappers and agents can consume retrieval expectations without scraping prose."
status = "done"
task_ids = ["TASK-106"]
tags = ["adoption", "agents", "memory", "json"]
updated_at = "2026-04-28T16:40:00Z"
+++

# Overview

This slice turns the existing tag guidance into shared structured data. Today those tag rules are rendered in the migration guide and direct agent brief, but JSON-first callers cannot reliably tell how SpM expects tags to behave for retrieval and note classification without scraping prose.

# Context

Shared adoption guidance already exposes structured doctor modes, workflow-loop commands, memory-workflow commands, source-material hints, capability-refresh review checks, and partial-adoption checks. Tag guidance is another stable, deterministic rule set that still lives only in prose.

# Goals

- Add structured tag guidance to shared adoption guidance.
- Flow that guidance into `spm agent brief --json`.
- Render the same tag guidance from the shared field in human-facing adoption outputs and the short agent brief.

# Non-Goals

- Do not change tag normalization or retrieval semantics in this slice.
- Do not redesign the text of the existing tag guidance beyond sourcing it from a shared field.
- Do not restructure unrelated adoption guidance areas.

# Constraints

- Keep the change additive for existing JSON consumers.
- Preserve the current tag guidance wording and order.
- Reuse the shared adoption guidance model instead of recomputing tag guidance in multiple renderers.

# Proposed Approach

Add a `tagGuidance` field to shared adoption guidance and populate it from the existing deterministic helper. Thread that field into `doctor --json`, `spm agent brief --json`, the migration guide, the direct agent brief, and the short human brief so all adoption surfaces stay aligned.

# Detailed Specification

- `AdoptionGuidance` exposes `tagGuidance: string[]`.
- `buildAdoptionGuidance(...)` populates it from the existing tag-guidance helper.
- `renderMigrationGuideMarkdown(...)` renders `## Tag Guidance For Retrieval` from `guidance.tagGuidance`.
- `renderDirectAgentBrief(...)` renders tag guidance from `guidance.tagGuidance` instead of calling the helper locally.
- `buildAgentWorkflowBrief(...)` exposes `tagGuidance` in the returned JSON shape.
- `renderAgentWorkflowBrief(...)` renders a “Tag guidance” section from the shared field.

# Edge Cases

- Repos with no active adoption issues should still receive the same tag guidance in structured form.
- JSON consumers should receive the field even when they never request the long migration guide.
- The change should not affect memory retrieval behavior itself; this slice only structures the guidance.

# Acceptance Criteria

- Shared adoption guidance exposes structured tag guidance.
- `spm agent brief --json` includes the same tag guidance.
- Human-facing migration and brief outputs render tag guidance from that shared field.
- Existing tag-guidance wording and order are preserved.
- Tests cover both structured output and the rendered tag-guidance sections.

# Open Questions

- None for this slice; it is an additive structuralization of existing deterministic guidance.
