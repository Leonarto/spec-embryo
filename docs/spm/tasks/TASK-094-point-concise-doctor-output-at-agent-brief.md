+++
doc_kind = "task"
id = "TASK-094"
title = "Point concise doctor output at agent brief"
summary = "Add a direct agent brief hint to default doctor output so callers discover the current repo workflow surface without needing verbose mode first."
status = "done"
spec_ids = ["SPEC-038"]
depends_on = []
blocked_by = []
priority = 2
created_at = "2026-04-27T14:46:16.752Z"
completed_at = "2026-04-27T18:19:40.000Z"
tags = []
updated_at = "2026-04-27T18:19:40.000Z"
+++

# Scope

- Add shared `spm agent brief` discoverability wording and reuse it from the concise doctor renderer.
- Keep the existing `doctor --verbose`, `doctor --json`, and `spm agent snippet` guidance intact while adding the middle-sized workflow path.
- Extend tests and concise doctor documentation to reflect the new discoverability contract.

# Done Looks Like

- Default `spm doctor` output mentions `spm agent brief` for the current repo workflow surface.
- The concise doctor wording stays aligned with shared adoption helpers instead of drifting into a one-off phrase.
- Doctor tests and docs lock the new discoverability path in.
- The expected behavior is implemented and verified.
- The linked project memory stays consistent.
