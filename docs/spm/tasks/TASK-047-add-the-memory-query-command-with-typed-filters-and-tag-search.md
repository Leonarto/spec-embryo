+++
doc_kind = "task"
id = "TASK-047"
title = "Add the memory query command with typed filters and tag search"
summary = "Expose spm memory query so humans and agents can retrieve managed docs by text, kind, status, tags, links, and neighborhood-aware filters using compact default output and stable JSON."
status = "done"
spec_ids = ["SPEC-013"]
depends_on = ["TASK-046"]
blocked_by = []
priority = 1
owner_role = "builder"
created_at = "2026-04-08T14:41:03.883Z"
completed_at = "2026-04-08T15:51:47.686Z"
tags = ["memory", "query", "cli"]
updated_at = "2026-04-08T15:51:47.686Z"
+++

# Scope

- Add a new `spm memory query` command on top of the shared index services.
- Support deterministic filtering by text, doc kind, status, tags, IDs, and relation-aware handles such as linked docs or local neighborhoods.
- Keep the default human-readable output compact and quick-switcher-like.
- Add stable JSON output for active agents and automation-friendly consumers.

# Done Looks Like

- `spm memory query` can retrieve managed docs by text and typed property filters.
- Tag-based retrieval works predictably over stored and normalized tags.
- Default output is compact and scan-friendly, while `--json` returns a stable structured shape.
- Tests cover the new query behavior, and the linked project memory stays consistent.
