+++
doc_kind = "task"
id = "TASK-093"
title = "Point concise doctor output at agent snippet"
summary = "Add a narrow agent snippet hint to default doctor output so callers discover the bounded AGENTS guidance without needing verbose mode first."
status = "done"
spec_ids = ["SPEC-037"]
depends_on = []
blocked_by = []
priority = 2
created_at = "2026-04-27T03:06:40.601Z"
completed_at = "2026-04-27T14:45:12.000Z"
tags = []
updated_at = "2026-04-27T14:45:12.000Z"
+++

# Scope

- Reuse the shared `spm agent snippet` discoverability wording from the adoption service in the concise `spm doctor` renderer.
- Keep `doctor --verbose` and `doctor --json` guidance intact while adding the narrower snippet path to the cheap default surface.
- Add regression coverage that proves non-verbose doctor output now advertises `spm agent snippet`.

# Done Looks Like

- Default `spm doctor` output mentions `spm agent snippet` for bounded external `AGENTS.md` guidance.
- The concise doctor hint stays aligned with the broader adoption surfaces through shared wording.
- Doctor tests lock the new discoverability path in.
- The expected behavior is implemented and verified.
- The linked project memory stays consistent.
