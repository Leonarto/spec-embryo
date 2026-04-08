+++
doc_kind = "task"
id = "TASK-058"
title = "Make body indexing section-aware and less noisy"
summary = "Refine managed body indexing so retrieval prefers meaningful section text over raw line fragments while staying deterministic."
status = "todo"
spec_ids = ["SPEC-015"]
depends_on = []
blocked_by = []
priority = 1
owner_role = "builder"
created_at = "2026-04-08T20:09:28.109Z"
tags = ["memory", "retrieval", "indexing"]
updated_at = "2026-04-08T20:09:28.109Z"
+++

# Scope

- refactor body indexing so it understands meaningful Markdown sections instead of blindly indexing each line
- preserve high-signal headings, decisions, goals, and notes while excluding low-signal formatting artifacts
- update retrieval tests so body-based matches remain possible without over-indexing noise

# Done Looks Like

- body indexing becomes easier to reason about and less noisy
- relevant concepts remain retrievable from managed document bodies
- the linked project memory stays consistent
