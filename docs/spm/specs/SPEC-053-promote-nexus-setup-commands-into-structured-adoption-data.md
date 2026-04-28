+++
doc_kind = "spec"
id = "SPEC-053"
title = "Promote Nexus setup commands into structured adoption data"
summary = "Expose the existing Nexus setup command guidance as shared structured adoption data so wrappers and agents can consume the bounded enablement commands without scraping prose."
status = "active"
task_ids = ["TASK-109"]
tags = ["adoption", "agents", "nexus", "json"]
updated_at = "2026-04-28T17:30:00Z"
+++

# Overview

This slice turns the existing Nexus setup command guidance into shared structured adoption data. Today the setup flow is structured as steps, but JSON-first callers still need to infer the actual bounded commands they should run from prose.

# Context

Shared adoption guidance already exposes structured doctor modes, workflow-loop commands, memory-workflow commands, source-material hints, tag guidance, Nexus coexistence guidance, Nexus setup flow steps, capability-refresh review checks, and partial-adoption checks. Nexus setup command suggestions are the next adjacent deterministic section that still lives only inside rendered prose.

# Goals

- Add typed Nexus setup command suggestions to shared adoption guidance.
- Flow those suggestions into `spm agent brief --json`.
- Render the same Nexus setup command suggestions from the shared field in human-facing adoption outputs and the short agent brief.

# Non-Goals

- Do not redesign the actual Nexus setup steps in this slice.
- Do not change Nexus validation logic or `spm nexus setup` behavior.
- Do not restructure unrelated adoption guidance areas.

# Constraints

- Keep the change additive for existing JSON consumers.
- Preserve the current Nexus setup commands and their bounded intent.
- Reuse the shared adoption guidance model instead of recomputing setup commands in multiple renderers.

# Proposed Approach

Add `nexusSetup.commands` to shared adoption guidance and populate it from a deterministic helper that reflects the existing bounded setup flow. Thread that field into `doctor --json`, `spm agent brief --json`, the migration guide, the direct agent brief, and the short human brief so all adoption surfaces stay aligned.

# Detailed Specification

- `NexusSetupGuidance` exposes `commands: AdoptionCommandSuggestion[]` alongside `steps`.
- `buildAdoptionGuidance(...)` populates the field from a deterministic Nexus setup command helper.
- `renderMigrationGuideMarkdown(...)` renders `## Nexus Setup Commands` from the shared field.
- `renderDirectAgentBrief(...)` renders Nexus setup command suggestions from the shared field.
- `buildAgentWorkflowBrief(...)` exposes Nexus setup command suggestions in the returned JSON shape.
- `renderAgentWorkflowBrief(...)` renders a “Nexus setup commands” section from that shared field.

# Edge Cases

- Repos that never enable Nexus should still receive the same bounded setup commands as informative shared data.
- JSON consumers should receive the typed commands even when they never request the long migration guide.
- The change should not introduce external-tool-specific indexing commands whose exact invocation depends on tools outside SpM.

# Acceptance Criteria

- Shared adoption guidance exposes typed Nexus setup command suggestions.
- `spm agent brief --json` includes the same setup commands.
- Human-facing migration and brief outputs render Nexus setup commands from that shared field.
- Existing bounded setup intent is preserved.
- Tests cover both structured output and the rendered Nexus setup command sections.

# Open Questions

- None for this slice; it is an additive structuralization of existing deterministic guidance.
