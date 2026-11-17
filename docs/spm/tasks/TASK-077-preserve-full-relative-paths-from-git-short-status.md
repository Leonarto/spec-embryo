+++
doc_kind = "task"
id = "TASK-077"
title = "Preserve full relative paths from git short status"
summary = "Fix changed-item parsing so root files and renamed entries keep correct relative paths across status and resume surfaces."
status = "done"
spec_ids = ["SPEC-023"]
depends_on = []
blocked_by = []
priority = 1
owner_role = "builder"
created_at = "2026-04-26T01:42:15.637Z"
completed_at = "2026-04-26T02:02:44.430Z"
tags = ["git", "status", "resume"]
updated_at = "2026-04-26T02:02:44.430Z"
+++

# Scope

- Harden git short-status path extraction in `src/engine.ts` so changed-item derivation handles normal paths, rename records, and quoted paths predictably.
- Add regression tests that assert exact reported paths, not only changed-item kinds.
- Keep the change local to status/resume parsing; do not expand into a larger git abstraction rewrite.

# Done Looks Like

- Changed root files such as `README.md` keep their exact relative path in changed-item reporting.
- Renamed managed docs are matched using their destination path.
- Quoted git paths no longer risk malformed changed-item output.
- Tests cover the parser branches introduced in this slice.
- The linked project memory stays consistent.
