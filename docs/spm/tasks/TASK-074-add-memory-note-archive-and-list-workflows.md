+++
doc_kind = "task"
id = "TASK-074"
title = "Add memory note archive and list workflows"
summary = "Support deterministic archiving and note-centric inspection flows so captured memory can be managed without raw file edits."
status = "review"
spec_ids = ["SPEC-020"]
depends_on = ["TASK-073"]
blocked_by = []
priority = 2
owner_role = "builder"
created_at = "2026-04-26T00:17:45.282Z"
tags = ["memory", "notes", "workflow"]
updated_at = "2026-04-26T00:39:12.030Z"
+++

# Scope

- Add deterministic archive and restore-style workflows for `memory-note` documents once create/update flows exist.
- Add a note-centric inspection or listing surface so humans and agents do not need to assemble every management step from `memory query`.
- Keep note-management flows aligned with the existing scope, write-policy, and consolidation rules.

# Done Looks Like

- Notes can be managed end to end without raw file edits for normal archive and inspection workflows.
- Archive behavior stays compatible with retrieval, consolidation, and eval expectations.
- The linked project memory stays consistent.
