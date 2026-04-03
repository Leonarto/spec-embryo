+++
doc_kind = "spec"
id = "SPEC-006"
title = "Add detail views for specs and tasks"
summary = "Define drill-down detail pages that let humans and agents inspect a single spec or task with linked context, state, and history."
status = "done"
task_ids = ["TASK-018", "TASK-019", "TASK-020"]
tags = ["ui", "details", "navigation", "self-hosting"]
owner = "human-ai"
updated_at = "2026-04-03T14:52:03.012Z"
+++

# Overview

Add dedicated detail views for individual specs and tasks so the local UI can support focused inspection, review, and resume work instead of forcing everything through list or board summaries.

## Context

The current UI gives strong overview surfaces, but once a user or agent wants to inspect one item deeply, they have to jump back to raw Markdown files or infer context from summaries. This becomes more limiting as the repo gains:

- more specs
- more tasks
- richer lifecycle metadata
- archival and history
- deeper relations between specs, tasks, handoffs, and current state

Focused detail pages should make the UI more useful for spec review, implementation planning, debugging blocker chains, and handoff/resume work.

## Goals

- Add a dedicated detail route for a single spec.
- Add a dedicated detail route for a single task.
- Show the most relevant linked context without forcing users to leave the page immediately.
- Make these pages useful for both humans and agents resuming a slice of work.
- Preserve the file-backed source-of-truth model and avoid editing complexity in the first slice.

## Non-Goals

- Do not add full in-browser document editing yet.
- Do not replace Markdown files as the canonical location for authored content.
- Do not add nested comment systems or collaborative annotations in the first version.
- Do not require client-side state management beyond normal route loading.

## Constraints

- Detail pages must reuse shared deterministic services rather than invent route-local parsing.
- The UI must keep clear what is source data and what is derived context.
- Navigation between overview surfaces and detail pages should feel natural and lightweight.

## Proposed Approach

- Add a spec detail route keyed by spec ID.
- Add a task detail route keyed by task ID.
- Make cards, rows, and linked references in existing views navigate into these routes.
- For spec details, show:
  - frontmatter summary and status
  - linked tasks grouped by lifecycle state
  - current progress indicators
  - related handoff or current-state context when relevant
  - rendered narrative body sections from the Markdown doc
- For task details, show:
  - lifecycle status and priority
  - dependency and blocker relationships
  - linked specs
  - current-state relevance
  - rendered narrative body sections
  - future-ready space for lifecycle timestamps and archival metadata

## Detailed Specification

- Each detail page should have a clear header with ID, title, status, and summary.
- The page should include a small set of secondary metadata chips rather than a dense property dump.
- Spec detail should highlight linked tasks and which ones are active, blocked, in review, or done.
- Task detail should clearly distinguish:
  - declared dependencies
  - unmet dependencies
  - blocking relationships
  - linked spec context
- Detail views should expose links back to the relevant board, list, or grouped view.
- The rendered Markdown body should remain readable and preserve sections from the source file.
- If a requested item does not exist, the page should show a deterministic not-found state rather than a vague blank view.

## Edge Cases

- A task may link to multiple specs; the page should show all of them clearly.
- A spec may have zero linked tasks; the page should still be useful as a planning document.
- A task may be archived later; the detail page should still render it with archival context instead of hiding it.
- A spec or task body may be sparse; the page should still present the structured metadata cleanly.

## Acceptance Criteria

- Users can navigate from overview surfaces into a dedicated spec detail page and a dedicated task detail page.
- Spec detail pages show linked tasks and relevant derived progress context.
- Task detail pages show dependencies, blockers, and linked specs clearly.
- Detail pages render the underlying Markdown narrative body in a readable way.
- Missing IDs return a graceful deterministic fallback.

## Resolved Decisions

- The first version renders full Markdown body content inline by default so humans and agents can inspect the source narrative without extra clicks.
- Task detail pages can surface a small deterministic set of related handoff snippets directly when they are easy to resolve from linked specs or active task references.
