+++
doc_kind = "task"
id = "TASK-051"
title = "Improve conceptual ranking for deterministic memory retrieval"
summary = "Adjust deterministic retrieval scoring so stronger conceptual anchors like specs can outrank narrower tasks when they better summarize a topic."
status = "done"
spec_ids = ["SPEC-014"]
depends_on = []
blocked_by = []
priority = 1
owner_role = "builder"
created_at = "2026-04-08T17:55:38.968Z"
completed_at = "2026-04-08T18:03:01.845Z"
tags = ["memory", "ranking", "retrieval"]
updated_at = "2026-04-08T18:03:01.845Z"
+++

# Scope

- adjust deterministic text scoring so parent specs can outrank narrower tasks when they better summarize a topic
- keep exact-match behavior intact while adding a bounded spec-anchor bonus
- verify the new ranking against real self-hosted topics such as `adoption` and `memory query`

# Done Looks Like

- topic queries like `adoption` or `memory query` surface the umbrella spec before narrower implementation tasks
- ranking remains deterministic and explainable
- the linked project memory stays consistent
