+++
doc_kind = "task"
id = "TASK-120"
title = "Add compatibility tests for core JSON contracts"
summary = "Lock the required portions of doctor, status, and agent-facing JSON outputs behind focused compatibility tests."
status = "blocked"
spec_ids = ["SPEC-059"]
depends_on = ["TASK-119"]
blocked_by = ["TASK-119"]
priority = 2
created_at = "2026-05-20T22:25:00Z"
tags = []
updated_at = "2026-05-20T22:25:00Z"
+++

# Scope

- Add compatibility tests for the most important JSON command surfaces.
- Distinguish stable fields from intentionally flexible output areas.
- Reuse shared helpers where needed to reduce JSON drift.
- Document how to extend structured outputs without breaking consumers.

# Done Looks Like

- Core machine-consumable outputs have explicit compatibility coverage.
- Additive changes can proceed without accidental contract regression.
- Human-facing output flexibility remains intact.
- Tests make the stable contract enforceable.
