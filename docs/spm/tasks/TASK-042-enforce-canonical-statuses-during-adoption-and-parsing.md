+++
doc_kind = "task"
id = "TASK-042"
title = "Enforce canonical statuses during adoption and parsing"
summary = "Reject non-canonical spec/task statuses in managed docs and teach migration guidance to use the exact allowed enums."
status = "done"
spec_ids = ["SPEC-010"]
depends_on = []
blocked_by = []
priority = 1
owner_role = "builder"
created_at = "2026-04-07T21:38:38.828Z"
completed_at = "2026-04-07T21:40:40.226Z"
tags = ["adoption", "statuses", "validation"]
updated_at = "2026-04-07T21:40:40.226Z"
+++

# Scope

- Reject non-canonical spec and task statuses inside managed SpM docs instead of silently falling back to defaults during parsing.
- Make adoption guidance and the direct agent brief state the exact canonical enums for spec and task statuses.
- Make `spec import-prompt` explicitly tell another agent to map synonyms like `planned` and `completed` to the canonical SpM statuses before writing managed docs.
- Add deterministic tests that prove invalid managed statuses fail fast and the migration guidance teaches the allowed values.

# Done Looks Like

- Managed docs with non-canonical statuses fail parsing instead of drifting silently into fallback values.
- Migration and adoption guidance explicitly list the allowed spec and task statuses.
- Import guidance tells the agent not to use synonym statuses in managed output.
- The linked project memory stays consistent.
