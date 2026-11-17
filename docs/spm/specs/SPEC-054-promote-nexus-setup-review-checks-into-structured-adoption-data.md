+++
doc_kind = "spec"
id = "SPEC-054"
title = "Promote Nexus setup review checks into structured adoption data"
summary = "Expose the existing bounded Nexus post-setup checks as shared structured adoption data so wrappers and agents can validate enablement without scraping prose."
status = "done"
task_ids = ["TASK-110"]
tags = ["adoption", "agents", "nexus", "json"]
updated_at = "2026-04-28T19:44:58.397Z"
+++

# Overview

This slice turns the bounded Nexus post-setup review checklist into shared structured adoption data. Today the setup steps and commands are structured, but JSON-first callers still need to infer how to confirm that the enablement actually landed correctly.

# Context

Shared adoption guidance already exposes structured doctor modes, workflow-loop commands, memory-workflow commands, source-material hints, tag guidance, Nexus coexistence guidance, Nexus setup flow steps, Nexus setup command suggestions, capability-refresh review checks, and partial-adoption checks. Nexus setup review checks are the next adjacent deterministic section that still lives only as implication across prose surfaces.

# Goals

- Add structured Nexus setup review checks to shared adoption guidance.
- Flow those checks into `spm agent brief --json`.
- Render the same Nexus setup review checks from the shared field in human-facing adoption outputs and the short agent brief.

# Non-Goals

- Do not redesign the actual Nexus setup steps or commands in this slice.
- Do not change Nexus validation logic or `spm nexus setup` behavior.
- Do not introduce tool-specific indexing commands beyond the bounded existing wording.

# Constraints

- Keep the change additive for existing JSON consumers.
- Preserve the existing bounded Nexus safety model, including the human-approval gate before apply.
- Reuse the shared adoption guidance model instead of recomputing review checks in multiple renderers.

# Proposed Approach

Add `nexusSetup.reviewChecks` to shared adoption guidance and populate it from a deterministic helper. Thread that field into `doctor --json`, `spm agent brief --json`, the migration guide, the direct agent brief, and the short human brief so all adoption surfaces stay aligned.

# Detailed Specification

- `NexusSetupGuidance` exposes `reviewChecks: string[]` alongside `steps` and `commands`.
- `buildAdoptionGuidance(...)` populates the field from a deterministic Nexus setup review-check helper.
- `renderMigrationGuideMarkdown(...)` renders `## Nexus Setup Review Checks` from the shared field.
- `renderDirectAgentBrief(...)` renders Nexus setup review checks from the shared field.
- `buildAgentWorkflowBrief(...)` exposes Nexus setup review checks in the returned JSON shape.
- `renderAgentWorkflowBrief(...)` renders a “Nexus setup review checks” section from that shared field.

# Edge Cases

- Repos that never enable Nexus should still receive the same bounded review checklist as informative shared data.
- JSON consumers should receive the checks even when they never request the long migration guide.
- The checks should remain generic enough to apply whether or not the external GitNexus tool is installed.

# Acceptance Criteria

- Shared adoption guidance exposes structured Nexus setup review checks.
- `spm agent brief --json` includes the same review checks.
- Human-facing migration and brief outputs render Nexus setup review checks from that shared field.
- Existing bounded safety and verification intent is preserved.
- Tests cover both structured output and the rendered Nexus setup review-check sections.

# Open Questions

- None for this slice; it is an additive structuralization of existing deterministic guidance.
