+++
doc_kind = "task"
id = "TASK-004"
title = "Add a self-hosting skill and AGENTS policy for using spm on itself"
status = "done"
summary = "Create explicit guidance that tells agents working on this repo to use spm for status, specs, tasks, AGENTS checks, and managed-memory updates when possible."
spec_ids = ["SPEC-002"]
depends_on = []
blocked_by = []
priority = 1
owner_role = "orchestrator"
tags = ["self-hosting", "skills", "agents"]
updated_at = "2026-04-02T21:30:00Z"
+++

# Scope

Create the operational guidance layer that makes recursive self-use real in day-to-day work.

# Done Looks Like

- a repo-local skill tells agents how to use `spm` on this repo
- root `AGENTS.md` explicitly points agents to use `spm` first when possible
- managed specs/tasks/current state reflect the new recursive workflow direction
