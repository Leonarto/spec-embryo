+++
doc_kind = "task"
id = "TASK-072"
title = "Add prompt-cache-aware backend bundle assembly"
summary = "Assemble backend prompt bundles with stable prefixes and variable tails so API-facing flows can benefit from provider-side prompt caching without changing repo memory semantics."
status = "done"
spec_ids = ["SPEC-019"]
depends_on = ["TASK-066", "TASK-067", "TASK-071"]
blocked_by = []
priority = 3
created_at = "2026-04-25T22:42:10.880Z"
completed_at = "2026-04-26T00:05:32.572Z"
tags = ["backends", "prompt", "optimization"]
updated_at = "2026-04-26T00:05:32.572Z"
+++

# Scope

- Improve backend prompt-bundle assembly so stable instructions and slowly changing repo context stay in reusable prefixes where supported.
- Keep volatile task-specific data and query-specific tails separate from static policy and repo context.
- Make the optimization optional and backend-aware so deterministic correctness does not depend on provider caching behavior.
- Build on the stable prompt contract already shared by prompt-return and subprocess backends.

# Done Looks Like

- Backend prompt bundles preserve stable prefixes and variable tails where the backend can benefit.
- Deterministic and prompt-return flows remain correct even without caching support.
- Regression tests cover bundle ordering and contract stability.
- Docs explain the optimization without overstating provider-specific guarantees.
