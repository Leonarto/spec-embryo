+++
doc_kind = "task"
id = "TASK-118"
title = "Add release planning, versioning, and changelog flows"
summary = "Turn release prep into a first-class SpM workflow with version recommendations, release notes, and readiness checks."
status = "done"
spec_ids = ["SPEC-058"]
depends_on = ["TASK-117"]
blocked_by = ["TASK-117"]
priority = 2
created_at = "2026-05-20T22:23:00Z"
completed_at = "2026-05-20T17:23:51.108Z"
tags = []
updated_at = "2026-05-20T17:23:51.108Z"
+++

# Scope

- Add release planning and readiness verification surfaces.
- Add deterministic version recommendation and changelog generation flows.
- Reuse existing publish-skill boundaries and approval expectations.
- Add tests for release recommendations and no-op release states.

# Done Looks Like

- Release prep is easier to repeat and explain.
- Version recommendations are grounded in repo-local evidence.
- Human-controlled publish steps remain explicit.
- Tests cover release planning and notes generation behavior.
