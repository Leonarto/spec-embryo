+++
doc_kind = "task"
id = "TASK-050"
title = "Document tag adoption and retrieval guidance for external repos"
summary = "Make spec format and adoption artifacts explicitly teach how tags should be preserved, normalized softly, and used as retrieval handles for later memory query flows."
status = "done"
spec_ids = ["SPEC-013"]
depends_on = ["TASK-047"]
blocked_by = []
priority = 2
owner_role = "writer"
created_at = "2026-04-08T14:41:21.402Z"
completed_at = "2026-04-08T17:46:44.895Z"
tags = ["memory", "tags", "adoption"]
updated_at = "2026-04-08T17:46:44.895Z"
+++

# Scope

- Update adoption and spec-format guidance so tags are clearly presented as retrieval handles rather than accidental metadata.
- Teach external-repo migration flows to preserve meaningful legacy topical labels as tags when they improve retrieval.
- Document soft normalization expectations such as preferring short stable tags and avoiding unnecessary synonym drift.
- Keep this guidance aligned with the new memory query behavior rather than inventing a separate tag policy disconnected from retrieval.

# Done Looks Like

- Adoption and documentation surfaces explicitly teach how tags support retrieval.
- The guidance encourages stable, short, retrieval-friendly tags without requiring a hard taxonomy checker.
- The tag guidance matches the memory-query feature shape and is covered by tests where appropriate.
- The linked project memory stays consistent.
