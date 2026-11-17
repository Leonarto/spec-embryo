+++
doc_kind = "task"
id = "TASK-055"
title = "Reject empty memory text queries and add regression coverage"
summary = "Treat blank or whitespace-only text input as absent or invalid instead of producing universal matches with misleading reasons."
status = "done"
spec_ids = ["SPEC-014"]
depends_on = ["TASK-054"]
blocked_by = []
priority = 1
owner_role = "builder"
created_at = "2026-04-08T18:49:34.398Z"
completed_at = "2026-04-08T18:55:49.117Z"
tags = ["memory", "retrieval", "validation"]
updated_at = "2026-04-08T18:55:49.117Z"
+++

# Scope

- reject blank or whitespace-only `--text` inputs instead of letting them silently match all managed docs
- make the error deterministic and explicit for both humans and agents
- add regression coverage so empty-query behavior cannot drift back into false-positive matching

# Done Looks Like

- empty text queries fail clearly instead of producing misleading matches and reasons
- the regression suite protects the fix
- the linked project memory stays consistent
