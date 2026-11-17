+++
doc_kind = "task"
id = "TASK-054"
title = "Index managed document bodies for memory retrieval"
summary = "Expand deterministic memory indexing so body sections contribute searchable text instead of limiting retrieval to title, summary, and tags."
status = "done"
spec_ids = ["SPEC-014"]
depends_on = []
blocked_by = []
priority = 1
owner_role = "builder"
created_at = "2026-04-08T18:49:34.267Z"
completed_at = "2026-04-08T18:55:49.078Z"
tags = ["memory", "retrieval", "indexing"]
updated_at = "2026-04-08T18:55:49.078Z"
+++

# Scope

- expand deterministic indexing so memory query can match meaningful phrases from Markdown bodies, not only frontmatter metadata
- keep the body indexing explicit and file-backed by extracting stable text fragments from managed docs
- add regression coverage proving body-only phrases are retrievable

# Done Looks Like

- retrieval can find relevant specs/tasks from body content such as goals, non-goals, or decisions
- body indexing remains deterministic and explainable
- the linked project memory stays consistent
