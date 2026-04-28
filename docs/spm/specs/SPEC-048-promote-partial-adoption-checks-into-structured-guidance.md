+++
doc_kind = "spec"
id = "SPEC-048"
title = "Promote partial-adoption checks into structured guidance"
summary = "Expose the partial-adoption cleanup checklist as shared structured guidance so wrappers and agents can consume it without scraping prose-only adoption artifacts."
status = "active"
task_ids = ["TASK-104"]
tags = ["adoption", "agents", "doctor", "json"]
updated_at = "2026-04-28T15:30:00Z"
+++

# Overview

This slice turns the existing partial-adoption cleanup checklist into shared structured guidance. Today those checks only live in rendered prose inside the migration guide and direct agent brief, so JSON-first callers cannot reliably know what still needs review when a repo is only partially adopted.

# Context

SpM has already been making adoption guidance progressively more structured: doctor-mode commands, workflow-loop commands, memory-workflow commands, direct-agent suggestions, capability-refresh commands, and capability-refresh review checks now come from one shared deterministic contract. Partial-adoption checks are a remaining prose-only checklist in that same family.

# Goals

- Add structured partial-adoption checks to shared adoption guidance.
- Flow those checks into `spm agent brief --json`.
- Render the same checklist in the human-facing adoption outputs and short agent brief from one shared field.

# Non-Goals

- Do not redesign the actual partial-adoption checklist content in this slice.
- Do not remove the existing rendered partial-adoption sections from migration artifacts.
- Do not restructure unrelated adoption guidance fields.

# Constraints

- Keep the change additive for existing JSON consumers.
- Preserve the current behavior for fully adopted repos where no partial-adoption checklist should be emitted.
- Reuse the shared adoption guidance model instead of adding special-case renderer-only branching.

# Proposed Approach

Add a `partialAdoptionChecks` field to shared adoption guidance and populate it from the existing partial-adoption checklist helper when the adoption state is `partially-adopted`. Thread that same field through `doctor --json`, `spm agent brief --json`, and the human-facing adoption renderers so all surfaces stay aligned. Extend tests to cover both partial and fully adopted paths.

# Detailed Specification

- `AdoptionGuidance` exposes `partialAdoptionChecks: string[]`.
- `buildAdoptionGuidance(...)` populates that field from the existing partial-adoption checklist helper.
- `renderMigrationGuideMarkdown(...)` renders `## Partial Adoption Checks` from `guidance.partialAdoptionChecks` instead of recomputing the list locally.
- `renderDirectAgentBrief(...)` renders the “Before declaring adoption complete” checklist from `guidance.partialAdoptionChecks`.
- `buildAgentWorkflowBrief(...)` exposes `partialAdoptionChecks` in the returned JSON shape.
- `renderAgentWorkflowBrief(...)` renders a “Partial adoption checks” section only when the field is non-empty.

# Edge Cases

- Fresh or fully adopted repos should expose an empty `partialAdoptionChecks` list.
- Partially adopted repos with unrelated doctor findings should still expose the same checklist deterministically.
- The structured field should not depend on verbose-mode rendering; JSON consumers must receive it even when they never read the migration guide.

# Acceptance Criteria

- Shared adoption guidance exposes a structured partial-adoption checklist.
- `spm agent brief --json` includes the same checklist.
- Human-facing migration and agent-brief outputs render the partial-adoption checklist from that shared field.
- Fully adopted repos keep the field empty and do not render a partial-adoption section.
- Tests cover both partial-adoption and fully adopted behavior.

# Open Questions

- None for this slice; it is an additive structuralization of an existing deterministic checklist.
