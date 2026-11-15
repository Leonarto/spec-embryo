+++
doc_kind = "task"
id = "TASK-133"
title = "Add opt-in repository-local context hook presets"
summary = "Implement reviewed SPEC-061 P1-B preview/apply/remove and bounded read-only hook context without modifying personal configuration."
status = "done"
spec_ids = ["SPEC-061"]
depends_on = ["TASK-132"]
blocked_by = []
priority = 1
owner_role = "implementation"
created_at = "2026-11-15T18:47:28.231Z"
completed_at = "2026-11-15T19:45:59.956Z"
tags = ["parallel-implementation", "harness"]
updated_at = "2026-11-15T19:45:59.956Z"
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

Implemented and independently approved by Astra. Independent verification: 51 tests/528 assertions passed; stdin fallback about 1.06s; blocked Git worker about 4.06s with descendant PID gone. A 2,803,106-byte plan stdout parsed as one JSON document. Preview caused no writes; apply/remove preserved a large unrelated value and foreign Stop handler. External configuration symlinks were rejected. Historical full suite: 275 passed, Bun coverage 90.21% functions/90.42% lines. AGENTS, skill validation and diff checks passed. Report: `/private/tmp/spm-task133-review.md`. No hooks were installed in the real repo or personal configuration.


# Astra ownership decisions

- An entry combining the SpM command and unrelated handlers is a conflict: do not adopt, rewrite, delete or duplicate it.
- Without a manifest, adopt only a complete entry canonically identical to the preset, including the five-second timeout. Matching signature with different fields is a conflict.
- Preview explicitly identifies exact-entry adoption; apply writes only its manifest. A subsequent owned entry with matching full hash is a no-op. No force or merge behavior is introduced.
