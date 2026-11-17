+++
doc_kind = "task"
id = "TASK-095"
title = "Point broader adoption outputs at agent brief"
summary = "Reference spm agent brief from adoption guide, migration guide, and steady-state agent surfaces when users need the current repo workflow without verbose doctor output."
status = "done"
spec_ids = ["SPEC-039"]
depends_on = []
blocked_by = []
priority = 2
created_at = "2026-04-27T18:20:35.476Z"
completed_at = "2026-04-27T19:35:01.000Z"
tags = []
updated_at = "2026-04-27T19:35:01.000Z"
+++

# Scope

- Add shared `spm agent brief` discoverability lines to the broader adoption and agent-facing renderers that already expose the snippet path.
- Keep the existing verbose doctor, snippet, and direct-agent-brief behavior intact while adding the direct brief command as a shorter workflow surface.
- Extend the text-surface tests that cover migration/adoption guidance and agent-brief rendering.

# Done Looks Like

- The broader adoption outputs mention `spm agent brief` when callers want the current repo workflow without the full verbose guide.
- The wording stays aligned with the concise doctor helper instead of drifting into one-off text.
- Tests lock the new discoverability path in across the affected surfaces.
- The expected behavior is implemented and verified.
- The linked project memory stays consistent.
