+++
doc_kind = "spec"
id = "SPEC-005"
title = "Add task archival and time-based analysis"
summary = "Define how closed tasks leave the active kanban without losing history, and how timeline analysis can be filtered by spec and time window."
status = "proposed"
task_ids = ["TASK-014", "TASK-015", "TASK-016"]
tags = ["workflow", "kanban", "analysis", "history"]
owner = "human-ai"
updated_at = "2026-04-03T02:39:56.644Z"
+++

# Overview

Keep the Kanban usable as a current-work tool by moving old closed work out of the active board without losing durable history, and add deterministic analysis/grouping primitives so the timeline and later analytics views can be filtered by spec sets and time windows.

## Context

The current task lifecycle already supports `review`, `done`, and `cancelled`, but the board will become noisy as more work accumulates. At the same time, the timeline and future analytical views need explicit lifecycle timestamps so they can answer questions such as:

- what was completed in the last 7 or 30 days
- what moved through review this week
- which specs or set of specs drove recent work
- what the timeline looks like for a chosen period instead of for all repo history

If closed tasks stay on the active board forever, the workflow surface stops being useful. If lifecycle dates are inferred from `updated_at`, analysis becomes incorrect because trivial metadata edits change the apparent completion date.

## Goals

- Keep the active Kanban focused on current and recently closed work.
- Preserve durable documentation for closed tasks instead of deleting or collapsing them into summaries.
- Add explicit lifecycle timestamps that reflect the last meaningful state transition rather than any document edit.
- Support deterministic filtering and grouping for timeline and analysis views by:
  - spec or set of specs
  - time window
  - active versus archived work
  - completion or cancellation period
- Make spec-based filtering useful for whole-slice understanding, not just active-board hygiene.
- Keep the model simple enough for v1 and compatible with future richer analytics.

## Non-Goals

- Do not introduce a separate database or analytics warehouse.
- Do not add probabilistic or AI-generated metrics for this slice.
- Do not add a new top-level `project` entity yet.
- Do not require full status history before basic archival and time-window analysis become possible.

## Constraints

- The repo remains the source of truth.
- Archival must be deterministic and reversible.
- `updated_at` must remain a generic document edit timestamp, not the source for completion analytics.
- Closed tasks must remain inspectable from linked specs, detail views, and future history views even after they leave the main Kanban.

## Proposed Approach

- Extend the task document model with explicit lifecycle fields:
  - `created_at`
  - `completed_at`
  - `cancelled_at`
  - `archived_at`
  - optional `archive_reason`
- Keep `status` as the canonical work state:
  - `todo`
  - `in_progress`
  - `blocked`
  - `review`
  - `done`
  - `cancelled`
- Treat archival as a visibility and organization concern, not as a replacement for `done` or `cancelled`.
- Add deterministic CLI flows such as:
  - `spm task archive TASK-123`
  - `spm task archive-done --older-than 7d`
  - `spm task archive-cancelled --older-than 7d`
  - `spm task restore TASK-123`
- Move archived tasks out of the active task collection into a durable archive location, while keeping repository loaders and UI views aware of both active and archived tasks.
- Add deterministic filters for timeline and analytical views based on lifecycle timestamps and linked spec IDs.
- Make spec-filtered task analysis include archived tasks by default so users can see both completed work and remaining work for the selected spec set.

## Detailed Specification

- When a task transitions to `done`, the system should set `completed_at` to the current timestamp.
- When a task transitions to `cancelled`, the system should set `cancelled_at` to the current timestamp.
- If a task leaves `done` and later returns to `done`, `completed_at` should represent the most recent completion timestamp.
- If a task leaves `cancelled` and later returns to `cancelled`, `cancelled_at` should represent the most recent cancellation timestamp.
- `updated_at` should continue to change for any material document rewrite and should not be used for archival cutoffs.
- Archived tasks should not appear in the main Kanban by default.
- Archived tasks should continue to appear in linked historical or detail contexts with a clear archived marker.
- The timeline view should support deterministic filtering by:
  - one spec
  - multiple specs
  - a predefined time window such as `7d`, `30d`, or `90d`
  - a custom start/end range later if and when the CLI/UI surface supports it cleanly
- A spec-based filter should match tasks linked to any selected spec ID.
- If one or more spec filters are active, the filtered analytical view should include archived tasks by default, because the goal is to understand the full work slice for that spec or set of specs.
- The active Kanban may still hide archived tasks by default even when a spec filter exists, but analytical and timeline views should be able to surface archived work for selected specs without requiring a separate archive toggle first.
- Completion-based analysis should use `completed_at`.
- Cancellation-based analysis should use `cancelled_at`.
- Time-window filters should apply to the relevant lifecycle timestamp for the selected analysis mode.
- If a task is archived, archival should not erase completion or cancellation timestamps.
- A legacy task without `completed_at` or `cancelled_at` should not be selected by time-based archival commands until its lifecycle timestamp is explicitly backfilled or the task is archived manually.

## Edge Cases

- A task may be `done` but very recently completed, so it should still remain visible on the board until it ages past the chosen archive threshold.
- A task may be `done` and later reopened; the system should stop treating it as archival-eligible while it is active again.
- A task may have no `completed_at` because it predates the new lifecycle fields; migration behavior must be explicit.
- A task may belong to multiple specs; grouped analysis should include it once while still showing all linked specs.
- A multi-spec filter may select tasks shared by several specs; those tasks should appear once in the filtered result, not duplicated per matching spec.
- A task may be archived even if no time window filter is active; detail views still need to surface it cleanly.

## Acceptance Criteria

- Closed tasks can be archived without deleting their durable documentation.
- `spm task archive-done --older-than 7d` can deterministically select eligible tasks using `completed_at`, not `updated_at`.
- The main Kanban can exclude archived tasks by default.
- The system can deterministically filter timeline or analysis views by spec set and by time window using explicit lifecycle timestamps.
- Selecting one or more specs can show the full related task slice, including archived tasks, so users can inspect what was done and what remains to be done for those specs.
- Archived tasks remain available in linked detail and historical views.
- The model remains file-backed and readable in Markdown plus TOML.

## Open Questions

- Whether archived tasks should move into `docs/spm/archive/tasks/` immediately or remain in-place with an archived flag for a first migration slice.
- Whether the default Kanban should show recently completed work for a fixed rolling window or via an explicit user-controlled toggle.
