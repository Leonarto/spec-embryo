+++
doc_kind = "task"
id = "TASK-092"
title = "Point broader adoption outputs at agent snippet"
summary = "Reference spm agent snippet from doctor and agent brief surfaces when users only need the bounded AGENTS guidance."
status = "review"
spec_ids = ["SPEC-036"]
depends_on = []
blocked_by = []
priority = 2
created_at = "2026-04-27T02:19:46.257Z"
tags = []
updated_at = "2026-04-27T02:22:58.760Z"
+++

# Scope

- Add explicit `spm agent snippet` references to the adoption guide, migration guide, direct agent brief, and steady-state agent brief where those surfaces already discuss the bounded external `AGENTS.md` snippet.
- Keep the wording shared through reusable service helpers rather than scattering command-local mentions.
- Update tests for the text surfaces that should now advertise the direct snippet command.

# Done Looks Like

- `doctor --verbose` guidance points to `spm agent snippet` when callers only need bounded external `AGENTS.md` guidance.
- The migration guide, direct agent brief, and `spm agent brief` include the same discoverability hint.
- Tests lock the new wording in across the affected surfaces.
- The linked project memory stays consistent.
