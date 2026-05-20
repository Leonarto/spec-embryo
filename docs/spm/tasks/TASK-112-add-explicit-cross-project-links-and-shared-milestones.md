+++
doc_kind = "task"
id = "TASK-112"
title = "Add explicit cross-project links and shared milestones"
summary = "Represent repo-to-repo dependencies, related-project links, and rollout groupings on top of the portfolio registry."
status = "blocked"
spec_ids = ["SPEC-055"]
depends_on = ["TASK-111"]
blocked_by = ["TASK-111"]
priority = 2
created_at = "2026-05-20T22:17:00Z"
tags = []
updated_at = "2026-05-20T22:17:00Z"
+++

# Scope

- Add explicit cross-project relationship metadata to the portfolio layer.
- Support depends-on, related-project, and shared-milestone groupings.
- Surface those links in deterministic portfolio outputs.
- Add tests for missing, cyclic, or stale project references.

# Done Looks Like

- Portfolio consumers can see how projects relate without scraping prose.
- Shared milestones and dependency links are visible in structured and human output.
- Cycles or broken references are reported clearly.
- Tests cover relationship parsing and rendering behavior.
