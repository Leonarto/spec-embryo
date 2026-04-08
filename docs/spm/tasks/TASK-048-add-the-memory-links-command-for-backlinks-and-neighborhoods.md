+++
doc_kind = "task"
id = "TASK-048"
title = "Add the memory links command for backlinks and neighborhoods"
summary = "Expose spm memory links to show outgoing relations, backlinks, and deterministic one-hop or two-hop neighborhoods for any managed doc."
status = "done"
spec_ids = ["SPEC-013"]
depends_on = ["TASK-046"]
blocked_by = []
priority = 1
owner_role = "builder"
created_at = "2026-04-08T14:41:10.297Z"
completed_at = "2026-04-08T16:17:53.837Z"
tags = ["memory", "links", "graph"]
updated_at = "2026-04-08T16:17:53.837Z"
+++

# Scope

- Add a new `spm memory links <DOC-ID>` command on top of the shared link-graph services.
- Expose outgoing links, backlinks, and deterministic one-hop or two-hop neighborhoods for managed docs.
- Group relation output by relation type so humans and agents can understand why a doc is related rather than seeing an untyped list.
- Add stable JSON output for relation-aware tooling and future UI reuse.

# Done Looks Like

- `spm memory links` can show incoming and outgoing relations for a managed doc.
- Neighborhood expansion works deterministically for the supported depth levels.
- Relation output is grouped and readable in both default and JSON modes.
- Tests cover backlinks and neighborhood traversal, and the linked project memory stays consistent.
