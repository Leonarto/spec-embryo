+++
doc_kind = "spec"
id = "SPEC-016"
title = "Harden deterministic managed-document creation"
summary = "Prevent task and spec ID collisions during concurrent document creation while preserving cross-link consistency."
status = "done"
task_ids = ["TASK-060"]
tags = ["deterministic", "repository", "concurrency"]
updated_at = "2026-04-08T20:24:52.008Z"
+++

# Problem

Task and spec creation currently allocate the next numeric ID by scanning the existing files, which means concurrent creates can choose the same `TASK-XXX` or `SPEC-XXX` before either write lands. That produces duplicate logical IDs and leaves linked specs/tasks in an inconsistent state.

# Goals

- Serialize managed document creation across specs and tasks.
- Preserve deterministic ID allocation without introducing random suffixes or non-local state.
- Keep backlink updates consistent when multiple creates happen at nearly the same time.
- Make stale-lock handling ownership-safe so long-running create flows do not get evicted mid-mutation.

# Non-Goals

- Replace human-readable `TASK-XXX` or `SPEC-XXX` IDs with UUIDs.
- Add a database or external coordination service.
- Rework unrelated document mutation flows outside create-time hardening.

## Acceptance Criteria

- Concurrent `createTask` calls always produce unique sequential task IDs.
- Concurrent `createSpec` calls always produce unique sequential spec IDs.
- Linked spec/task backlinks stay correct after concurrent creates.
- Longer-running create flows keep their lock ownership until they finish, even when stale cleanup logic exists.
- Regression coverage protects the serialized create path.
