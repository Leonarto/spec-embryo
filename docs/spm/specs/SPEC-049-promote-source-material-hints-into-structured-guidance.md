+++
doc_kind = "spec"
id = "SPEC-049"
title = "Promote source-material hints into structured guidance"
summary = "Expose the existing source-material inspection hints as shared structured guidance so wrappers and agents can consume the initial migration-reading targets without scraping prose."
status = "active"
task_ids = ["TASK-105"]
tags = ["adoption", "agents", "doctor", "json"]
updated_at = "2026-04-28T16:00:00Z"
+++

# Overview

This slice turns the existing “source material to inspect first” guidance into shared structured data. Today those hints are rendered in the migration guide and direct agent brief, but JSON-first callers cannot reliably tell which docs or specs SpM wants another agent to inspect before migrating or rewriting project memory.

# Context

Shared adoption guidance now already carries structured doctor modes, workflow-loop commands, memory-workflow commands, direct-agent suggestions, capability-refresh commands, capability-refresh review checks, and partial-adoption checks. Source-material hints are one of the remaining adoption sections that still require prose scraping.

# Goals

- Add structured source-material hints to shared adoption guidance.
- Flow those hints into `spm agent brief --json`.
- Render the same source-material hints from that shared field in human-facing adoption outputs and the short agent brief.

# Non-Goals

- Do not redesign how candidate source folders are detected in this slice.
- Do not remove the existing source-material section from migration artifacts.
- Do not change unrelated adoption guidance sections.

# Constraints

- Keep the change additive for existing JSON consumers.
- Preserve the current fallback hint when no obvious docs/spec folders are detected.
- Reuse the shared adoption guidance model instead of recomputing source hints in each renderer.

# Proposed Approach

Add a `sourceMaterialHints` field to shared adoption guidance and populate it from the existing helper that derives likely migration-source paths from adoption inspection. Thread that field into `doctor --json`, `spm agent brief --json`, the migration guide, the direct agent brief, and the short human brief so all surfaces stay aligned.

# Detailed Specification

- `AdoptionGuidance` exposes `sourceMaterialHints: string[]`.
- `buildAdoptionGuidance(...)` populates it from the current source-material helper.
- `renderMigrationGuideMarkdown(...)` renders `## Source Material To Inspect First` from `guidance.sourceMaterialHints`.
- `renderDirectAgentBrief(...)` renders “What to inspect first” from `guidance.sourceMaterialHints`.
- `buildAgentWorkflowBrief(...)` exposes `sourceMaterialHints` in the returned JSON shape.
- `renderAgentWorkflowBrief(...)` renders a “What to inspect first” section from that shared field.

# Edge Cases

- Fresh repos without candidate docs/spec folders should still expose the existing fallback hint through the structured field.
- Repos with multiple candidate docs/spec folders should preserve all existing hints in deterministic order.
- Fully adopted repos should still expose the same source-material hints used by the longer adoption outputs.

# Acceptance Criteria

- Shared adoption guidance exposes structured source-material hints.
- `spm agent brief --json` includes the same source-material hints.
- Human-facing migration and brief outputs render the source-material section from that shared field.
- Existing fallback behavior for repos without obvious docs/spec folders is preserved.
- Tests cover both structured output and rendered source-material sections.

# Open Questions

- None for this slice; it is an additive structuralization of an existing deterministic helper.
