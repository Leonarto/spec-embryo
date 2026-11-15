+++
doc_kind = "task"
id = "TASK-133"
title = "Add opt-in repository-local context hook presets"
summary = "Implement reviewed SPEC-061 P1-B preview/apply/remove and bounded read-only hook context without modifying personal configuration."
status = "todo"
spec_ids = ["SPEC-061"]
depends_on = ["TASK-132"]
blocked_by = []
priority = 1
owner_role = "implementation"
created_at = "2026-11-15T18:47:28.231Z"
tags = ["parallel-implementation", "harness"]
updated_at = "2026-11-15T18:47:28.231Z"
+++

# Scope

Implement reviewed SPEC-061 P1-B preview/apply/remove and bounded read-only hook context without modifying personal configuration.

Source of truth: the independently reviewed P1 execution contract appended to SPEC-061. P2 remains conditional and outside this task.

# Execution and review

- Sol 6.1 High implements; Astra High decides technical changes and independently reviews a frozen diff.
- Preserve the documented byte limits, process deadlines, ownership checks and read-only defaults.
- Test provider/configuration behavior with isolated fixtures; no real hook installation, paid model invocation or personal configuration changes.
- Record actual verification evidence, resolve findings and commit before the next dependent slice.

# Verification record

Pending implementation.
