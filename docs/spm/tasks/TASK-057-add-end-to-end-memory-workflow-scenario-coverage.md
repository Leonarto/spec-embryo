+++
doc_kind = "task"
id = "TASK-057"
title = "Add end-to-end memory workflow scenario coverage"
summary = "Create higher-level scenario tests that exercise query, links, and brief together across realistic multi-spec memory workflows."
status = "todo"
spec_ids = ["SPEC-015"]
depends_on = []
blocked_by = []
priority = 2
owner_role = "reviewer"
created_at = "2026-04-08T20:09:28.102Z"
tags = ["memory", "testing", "workflow"]
updated_at = "2026-04-08T20:09:28.102Z"
+++

# Scope

- add broader scenario tests that exercise `memory query`, `memory links`, and `memory brief` together
- cover at least one multi-spec retrieval flow and one tag-driven retrieval flow
- assert workflow-level expectations such as “query finds the anchor”, “links traverses the neighborhood”, and “brief compresses the same slice coherently”

# Done Looks Like

- the repo has higher-level memory workflow coverage beyond narrow service tests
- failures in one memory command are easier to catch through scenario regressions
- the linked project memory stays consistent
