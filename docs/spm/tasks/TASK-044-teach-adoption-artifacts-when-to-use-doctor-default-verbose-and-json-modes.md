+++
doc_kind = "task"
id = "TASK-044"
title = "Teach adoption artifacts when to use doctor default verbose and json modes"
summary = "Make init and adoption guidance explicitly tell humans and agents to use spm doctor for cheap checks, --verbose for the long guide, and --json for structured consumption."
status = "done"
spec_ids = ["SPEC-010"]
depends_on = []
blocked_by = []
priority = 1
owner_role = "builder"
created_at = "2026-04-08T02:55:30.720Z"
completed_at = "2026-04-08T02:56:39.421Z"
tags = ["adoption"]
updated_at = "2026-04-08T02:56:39.421Z"
+++

# Scope

- Make the generated migration guide explicitly teach when to use `spm doctor`, `spm doctor --verbose`, and `spm doctor --json`.
- Make the generated direct agent brief carry the same rule so the human-pasted brief teaches another coding agent the cheap-by-default workflow.
- Add regression tests that lock the new wording into the init-generated adoption artifacts.

# Done Looks Like

- Adoption artifacts explicitly teach the doctor mode split instead of assuming agents will infer it.
- `init --json` still writes the guide and brief, now with the doctor-mode guidance included.
- The expected behavior is implemented and verified, and the linked project memory stays consistent.
