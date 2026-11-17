+++
doc_kind = "task"
id = "TASK-060"
title = "Serialize spec and task creation with a shared repository lock"
summary = "Use a filesystem lock so concurrent document creation cannot allocate duplicate TASK or SPEC ids."
status = "done"
spec_ids = ["SPEC-016"]
depends_on = []
blocked_by = []
priority = 3
created_at = "2026-04-08T20:24:51.900Z"
completed_at = "2026-04-08T20:25:15.217Z"
tags = ["deterministic", "repository", "concurrency"]
updated_at = "2026-04-08T20:25:15.217Z"
+++

# Scope

- Add a shared filesystem lock around spec/task creation so ID allocation and backlink rewrites happen in one serialized mutation window.
- Track lock ownership and keep the active lock fresh so stale cleanup cannot evict a live create flow or let an older owner remove a newer lock.
- Keep the lock local-first and file-backed under `.specpm` instead of introducing external coordination.
- Cover concurrent spec and task creation with regression tests that prove IDs stay unique and backlinks stay consistent.

# Done Looks Like

- `createSpec` and `createTask` serialize concurrent creates through one repository lock.
- The repository lock is owner-safe and heartbeat-backed, so longer-running create flows are not treated as stale.
- Parallel test calls produce `TASK-004..006` and `SPEC-002..004` without duplicate logical IDs.
- Cross-process create tests pass, not just same-process `Promise.all(...)` contention.
- Local guidance documents the invariant so future create flows do not bypass it.
