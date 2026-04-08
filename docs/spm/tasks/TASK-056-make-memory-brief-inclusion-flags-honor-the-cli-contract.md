+++
doc_kind = "task"
id = "TASK-056"
title = "Make memory brief inclusion flags honor the CLI contract"
summary = "Implement real include and exclude semantics for neighbors, current state, and handoffs so memory brief output matches its documented flags."
status = "done"
spec_ids = ["SPEC-014"]
depends_on = ["TASK-055"]
blocked_by = []
priority = 1
owner_role = "builder"
created_at = "2026-04-08T18:49:34.400Z"
completed_at = "2026-04-08T18:55:49.157Z"
tags = ["memory", "brief", "cli"]
updated_at = "2026-04-08T18:55:49.157Z"
+++

# Scope

- make `memory brief` inclusion controls real by supporting explicit include and exclude semantics for neighbors, current state, and handoffs
- ensure text-mode briefs can surface neighbors when enabled instead of always returning an empty section
- add regression coverage for disabled sections and contradictory flag usage

# Done Looks Like

- the CLI flags for brief inclusion and exclusion produce the sections they promise
- text-mode and doc-centered briefs honor the same contract
- the linked project memory stays consistent
