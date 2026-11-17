+++
doc_kind = "task"
id = "TASK-096"
title = "Split direct-command guidance from snippet sections"
summary = "Move spm agent brief and spm agent snippet discoverability into a clearer direct-command section across adoption outputs while keeping snippet content narrow."
status = "done"
spec_ids = ["SPEC-040"]
depends_on = []
blocked_by = []
priority = 2
created_at = "2026-04-27T19:35:53.216Z"
completed_at = "2026-04-27T19:51:00.000Z"
tags = []
updated_at = "2026-04-27T19:51:00.000Z"
+++

# Scope

- Add a dedicated direct-command section to the broader adoption and agent-facing renderers.
- Remove direct-command discoverability lines from snippet-labeled sections while keeping the snippet content intact.
- Refresh generated adoption artifacts and update tests to assert the new structure.

# Done Looks Like

- The longer adoption outputs separate direct commands from snippet-only guidance.
- The same direct command wording is reused in its new section instead of drifting.
- Generated adoption artifacts and tests reflect the new section structure.
- The expected behavior is implemented and verified.
- The linked project memory stays consistent.
