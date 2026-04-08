+++
doc_kind = "task"
id = "TASK-046"
title = "Build the deterministic memory index and link graph foundations"
summary = "Create reusable services that index managed docs, normalize retrieval terms, and compute typed incoming/outgoing relations for specs, tasks, current state, and handoffs."
status = "done"
spec_ids = ["SPEC-013"]
depends_on = []
blocked_by = []
priority = 1
owner_role = "builder"
created_at = "2026-04-08T14:40:34.788Z"
completed_at = "2026-04-08T15:17:29.714Z"
tags = ["memory", "retrieval", "graph"]
updated_at = "2026-04-08T15:17:29.714Z"
+++

# Scope

- Add reusable service primitives for indexing managed docs into a deterministic retrieval structure.
- Normalize lookup terms from IDs, titles, summaries, and tags without introducing semantic or remote search.
- Build typed incoming and outgoing link relations across specs, tasks, current state, and handoffs.
- Expose relation/grouping helpers that later commands can reuse instead of each command rebuilding its own graph logic.

# Done Looks Like

- `memory-index` and `memory-links` style services exist and are reusable from other commands.
- Managed docs can be flattened into a queryable structure with deterministic typed fields and normalized lookup terms.
- Link traversal can answer immediate incoming and outgoing relationships for managed docs.
- Focused tests cover indexing and relation derivation, and the linked project memory stays consistent.
