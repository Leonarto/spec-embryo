+++
doc_kind = "task"
id = "TASK-071"
title = "Improve retrieval ordering and section-level packing"
summary = "Rank and assemble compact context so the strongest evidence appears first, whole documents are avoided when possible, and long-context attention is used more effectively."
status = "todo"
spec_ids = ["SPEC-019"]
depends_on = ["TASK-066", "TASK-067", "TASK-068"]
blocked_by = []
priority = 2
created_at = "2026-04-25T22:42:06.199Z"
tags = ["retrieval", "context", "ranking"]
updated_at = "2026-04-25T22:56:00.000Z"
+++

# Scope

- Improve retrieval and briefing output so the strongest supporting evidence is surfaced first.
- Expand section-aware extraction so packs and briefs can prefer smaller stable slices over whole-document inclusion.
- Distinguish mandatory context from supporting and optional expansion material in human and JSON output.
- Keep ranking deterministic and explainable through explicit reasons and ordering rules.

# Done Looks Like

- Retrieval and briefing output is better ordered for long-context consumption.
- Section-level extraction reduces unnecessary document stuffing.
- Match reasons and ordering remain explicit and testable.
- The improved packaging behavior is covered by regression tests and aligned docs.
