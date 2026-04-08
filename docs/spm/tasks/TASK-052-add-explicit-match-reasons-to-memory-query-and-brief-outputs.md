+++
doc_kind = "task"
id = "TASK-052"
title = "Add explicit match reasons to memory query and brief outputs"
summary = "Expose stable deterministic match-reason hints in human output and JSON so another agent can see why a document was retrieved."
status = "done"
spec_ids = ["SPEC-014"]
depends_on = ["TASK-051"]
blocked_by = []
priority = 1
owner_role = "builder"
created_at = "2026-04-08T17:55:51.346Z"
completed_at = "2026-04-08T18:03:01.886Z"
tags = ["memory", "reasons", "retrieval"]
updated_at = "2026-04-08T18:03:01.886Z"
+++

# Scope

- expose stable `matchReasons` in `memory query` human output and JSON
- carry those reasons into text-based `memory brief` matches and explicit center selection
- keep the reason labels lightweight enough for repeated agent use

# Done Looks Like

- query and brief outputs show why results were selected without requiring source inspection
- JSON consumers receive stable deterministic reason arrays
- the linked project memory stays consistent
