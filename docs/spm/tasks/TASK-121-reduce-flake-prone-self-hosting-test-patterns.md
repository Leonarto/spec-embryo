+++
doc_kind = "task"
id = "TASK-121"
title = "Reduce flake-prone self-hosting test patterns"
summary = "Audit and refactor the most timing-, git-, and process-sensitive tests so the self-hosting suite fails less often for non-product reasons."
status = "done"
spec_ids = ["SPEC-060"]
depends_on = []
blocked_by = []
priority = 2
created_at = "2026-05-20T22:26:00Z"
completed_at = "2026-05-20T17:23:59.871Z"
tags = []
updated_at = "2026-05-20T17:23:59.871Z"
+++

# Scope

- Identify the most flaky self-hosting test areas.
- Improve isolation for time-, git-, lock-, and process-sensitive tests.
- Preserve signal and coverage while reducing false negatives.
- Add or update tests and fixtures where flake reduction changes behavior.

# Done Looks Like

- Historically noisy test areas are more reliable.
- Sensitive tests have clearer isolation boundaries.
- Coverage remains meaningful rather than weakened.
- The suite is safer to trust during release prep.
