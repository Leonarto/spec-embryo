+++
doc_kind = "task"
id = "TASK-059"
title = "Tighten memory tag matching semantics"
summary = "Move memory tag filtering toward predictable normalized tag semantics instead of permissive substring matches that can drift as the corpus grows."
status = "done"
spec_ids = ["SPEC-015"]
depends_on = []
blocked_by = []
priority = 1
owner_role = "builder"
created_at = "2026-04-08T20:09:28.109Z"
completed_at = "2026-04-09T02:01:57.913Z"
tags = ["memory", "tags", "retrieval"]
updated_at = "2026-04-09T02:01:57.913Z"
+++

# Scope

- replace permissive substring-style tag matching with a more predictable normalized tag filter contract
- document how retrieval should behave for exact tags, normalized variants, and non-matches
- add regression tests so future tag changes do not silently broaden or narrow the result set

# Done Looks Like

- tag filters feel predictable to humans and agents
- tag-based retrieval is less likely to drift as the corpus grows
- the linked project memory stays consistent
