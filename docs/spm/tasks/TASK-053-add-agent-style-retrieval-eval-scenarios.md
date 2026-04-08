+++
doc_kind = "task"
id = "TASK-053"
title = "Add agent-style retrieval eval scenarios"
summary = "Create a small deterministic eval suite that checks realistic agent retrieval questions against the self-hosted repo memory."
status = "done"
spec_ids = ["SPEC-014"]
depends_on = ["TASK-052"]
blocked_by = []
priority = 2
owner_role = "reviewer"
created_at = "2026-04-08T17:55:58.046Z"
completed_at = "2026-04-08T18:03:01.925Z"
tags = ["memory", "evals", "testing"]
updated_at = "2026-04-08T18:03:01.925Z"
+++

# Scope

- add a small regression suite that asks realistic agent questions against the self-hosted repo memory
- cover at least one adoption-oriented query, one memory-command-family query, and one migration brief scenario
- ensure the evals assert both conceptual ranking and visible match reasons

# Done Looks Like

- the repo has deterministic retrieval evals that read like real continuation questions
- ranking and match-reason regressions are easier to catch before shipping
- the linked project memory stays consistent
