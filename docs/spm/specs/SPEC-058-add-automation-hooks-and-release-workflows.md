+++
doc_kind = "spec"
id = "SPEC-058"
title = "Add automation hooks and release workflows"
summary = "Reduce drift and release friction with deterministic repo-event hooks and first-class release preparation commands."
status = "proposed"
task_ids = ["TASK-117", "TASK-118"]
tags = ["automation", "hooks", "release", "workflow"]
updated_at = "2026-05-20T22:09:00Z"
+++

# Overview

This slice adds deterministic automation around common repo lifecycle events and turns release preparation into a first-class SpM workflow rather than an ad hoc checklist.

# Context

As SpM becomes a daily project-management companion, managed memory drifts when users forget to update it after commits, merges, CI outcomes, or release prep. Release work itself also repeats similar steps that SpM can structure deterministically.

# Goals

- Add deterministic automation hooks around bounded repo events.
- Reduce managed-memory drift after common git and CI lifecycle transitions.
- Add first-class release planning, version recommendation, and changelog generation flows.
- Keep human approval explicit for state-changing or publish-adjacent actions.

# Non-Goals

- Do not add background daemons or remote orchestration in this slice.
- Do not make release publishing fully automatic.
- Do not replace existing git or CI tooling with SpM-owned equivalents.

# Constraints

- Hook behavior must stay bounded, inspectable, and opt-in.
- Release outputs must remain deterministic and based on repo-local facts.
- Human approval must remain explicit before destructive or publish-facing actions.
- Existing manual workflows must continue to work when hooks are disabled.

# Proposed Approach

Add a small opt-in hooks layer for selected repo events, then add release commands that can inspect recent managed work, recommend a version bump, assemble release notes, and verify readiness before the human runs the final publish command.

# Detailed Specification

- Hook installation and execution surfaces support a bounded set of lifecycle triggers such as commit, merge, CI result, or release prep.
- Hook outputs can recommend updates to current state, handoffs, tasks, or release docs without requiring hidden state.
- Release workflows support:
  - release planning
  - version recommendation
  - deterministic changelog or notes generation
  - readiness verification
- Release commands should integrate with existing self-hosting publish guidance instead of creating a second release policy.

# Edge Cases

- Hooks may run in environments without full git history or CI metadata.
- A repo may want release commands without enabling any automation hooks.
- Version recommendations must avoid implying authority when the change signal is ambiguous.
- Repos with no package publishing step should still be able to use generic release notes.

# Acceptance Criteria

- SpM has bounded, opt-in automation hooks around repo lifecycle events.
- Managed-memory drift can be reduced through deterministic hook guidance.
- Release planning, version recommendation, and changelog surfaces exist as first-class commands.
- Human publish approval remains explicit.

# Open Questions

- None for this planning slice; specific trigger coverage can be staged by task.
