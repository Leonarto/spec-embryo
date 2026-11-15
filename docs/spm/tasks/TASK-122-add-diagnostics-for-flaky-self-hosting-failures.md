+++
doc_kind = "task"
id = "TASK-122"
title = "Add diagnostics for flaky self-hosting failures"
summary = "Improve failure reporting and targeted rerun paths for the environment-sensitive parts of the SpM self-hosting suite."
status = "done"
spec_ids = ["SPEC-060"]
depends_on = ["TASK-121"]
blocked_by = ["TASK-121"]
priority = 2
created_at = "2026-05-20T22:27:00Z"
completed_at = "2026-05-20T17:24:02.870Z"
tags = []
updated_at = "2026-05-20T17:24:02.870Z"
+++

# Scope

- Add better diagnostics around flaky self-hosting failure classes.
- Provide deterministic rerun or narrowing paths for sensitive test areas.
- Distinguish likely environment/setup failures from product regressions.
- Add tests or fixtures for the new diagnostic surfaces where practical.

# Done Looks Like

- Failures in sensitive areas are easier to classify quickly.
- Future agents can localize flaky issues without guesswork.
- Diagnostic improvements do not drown out the actual failing signal.
- Release and self-hosting workflows benefit from clearer failure output.
