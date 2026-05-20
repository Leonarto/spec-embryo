+++
doc_kind = "task"
id = "TASK-116"
title = "Add deterministic retrieval ranking controls"
summary = "Let memory query, brief, and pack surfaces prioritize explicit relevance signals such as recency, active-work proximity, and tag overlap."
status = "blocked"
spec_ids = ["SPEC-057"]
depends_on = ["TASK-115"]
blocked_by = ["TASK-115"]
priority = 2
created_at = "2026-05-20T22:21:00Z"
tags = []
updated_at = "2026-05-20T22:21:00Z"
+++

# Scope

- Add bounded ranking controls to memory query, brief, and pack surfaces.
- Expose ranking metadata so callers can see why items were returned.
- Preserve deterministic defaults while allowing better large-repo tuning.
- Add tests around ranking behavior and backward-compatible defaults.

# Done Looks Like

- Retrieval quality can be tuned without hidden heuristics.
- Ranking explanations are visible to human and JSON-first callers.
- Existing deterministic defaults still work when callers provide no overrides.
- Tests cover common ranking branches and edge cases.
