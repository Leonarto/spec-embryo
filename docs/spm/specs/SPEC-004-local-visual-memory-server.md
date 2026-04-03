+++
doc_kind = "spec"
id = "SPEC-004"
title = "Add a local visual memory server for specs and tasks"
summary = "Expose the managed project memory through a local SvelteKit workspace with overview, task, spec, and timeline views that read directly from repo files."
status = "done"
task_ids = ["TASK-009", "TASK-010", "TASK-011", "TASK-012", "TASK-013", "TASK-017"]
tags = ["ui", "sveltekit", "local-server", "self-hosting"]
owner = "human-ai"
updated_at = "2026-04-03T16:20:43.856Z"
+++

# Overview

Add a local frontend server that gives humans and agents a faster visual way to inspect the same managed files that `spm status`, `spm spec list`, and `spm task list` already use.

## Context

The CLI is already useful for resume and state inspection, but the next step in the product direction is a local visual surface that can grow into richer repo-native visualization over time.

## Goals

- Start a local frontend from the CLI with one command.
- Read current state, specs, tasks, blockers, and derived next actions from the file-backed source of truth.
- Keep the server local-first and useful without any external backend.
- Build the first version on SvelteKit in a way that can evolve into a richer local server mode later.
- Make the dashboard good for agent-assisted work first and pleasant for humans second.
- Support multiple focused views instead of one overloaded landing page.

## Non-Goals

- Do not add edit-in-place mutation flows in the first UI slice.
- Do not add authentication, multi-user collaboration, or a remote backend.
- Do not fork the domain model or duplicate parsing logic inside the frontend.

## Constraints

- The UI must derive data from the existing deterministic repository and engine layer.
- The UI should launch through `spm`, not as an unrelated sidecar workflow.
- The first slice should remain small enough to keep maintenance sane while still being genuinely useful.

## Proposed Approach

- Add a shared dashboard service in the core product that returns a serialized view model from the existing repository and engine.
- Create a `web/` SvelteKit app that imports the shared dashboard service on the server side.
- Add a new CLI command, `spm ui`, that launches the local SvelteKit dev server against the current repo.
- Render a small workspace with a thin left navigation and four main views:
  - Dashboard: general operational overview, stats, agent data, and cross-cutting signals
  - Tasks: a kanban board based on effective task state
  - Specs: a spec-focused view with linked task progress
  - Timeline: a Gantt-style view using dependency order and deterministic effort defaults instead of dates

## Detailed Specification

- `spm ui` should accept `--host` and `--port`.
- The UI should be read-only in v1.
- The UI should load fresh data from disk on each request in development.
- The UI must clearly show which information is raw source-of-truth state versus deterministic derivation.
- Navigation should stay thin and persistent on the left side.
- The default landing view should be the general dashboard.
- Cross-cutting data that does not fit a specialized view should live in the general dashboard instead of being duplicated everywhere.
- Effective task state may be derived so blocked-by-dependency work appears in a blocked lane even if the raw status is still `todo`.
- Timeline bars should be ordered by dependency structure and sized by deterministic effort defaults until explicit effort estimates exist in the model.

## Edge Cases

- If the repo is uninitialized or the managed memory is partial, the page should still render a graceful empty or fallback state.
- If a task references a missing dependency, the UI should surface that explicitly.
- If AGENTS budgets are unhealthy, the dashboard should show the warning instead of hiding it.
- If multiple tasks can start at the same derived timeline offset, the timeline should still remain readable without dates.

## Acceptance Criteria

- `spm ui` starts a local SvelteKit server for the current repo.
- The workspace renders a general dashboard, a task kanban view, a spec view, and a Gantt-style timeline from repo files.
- The frontend uses shared deterministic product services rather than duplicating parsing logic.
- The UI remains useful when no agent backend is configured.
- The repo’s own managed memory can be inspected through the new server.
- Timeline effort defaults are deterministic and do not require date estimates.

## Open Questions

- Whether effort should later become an explicit task field instead of remaining derived by default.
- Whether future navigation should expand into drill-down detail pages for specs and tasks.
