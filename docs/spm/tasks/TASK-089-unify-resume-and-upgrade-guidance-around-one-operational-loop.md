+++
doc_kind = "task"
id = "TASK-089"
title = "Unify resume and upgrade guidance around one operational loop"
summary = "Teach doctor, init, and generated adoption artifacts to converge on one short repeatable SpM usage loop instead of scattering the guidance across multiple surfaces."
status = "in_progress"
spec_ids = ["SPEC-034"]
depends_on = ["TASK-088"]
blocked_by = []
priority = 1
created_at = "2026-04-26T23:34:52.549Z"
tags = ["adoption", "doctor", "resume"]
updated_at = "2026-04-27T00:26:24.629Z"
+++

# Scope

- Refactor doctor/init/adoption artifact guidance so they all teach one short repeatable SpM usage loop.
- Make upgrade guidance prepend a refresh branch to that loop instead of teaching a separate behavior model.
- Ensure `spm memory pack` and scoped-memory commands are placed in the right points of the loop, with bounded wording that does not over-prescribe them for trivial work.
- Align human-readable and JSON guidance surfaces so they describe the same operational contract.

# Done Looks Like

- `spm doctor`, refreshed adoption artifacts, and the direct agent brief all reinforce the same SpM usage loop.
- Upgrade-detected guidance tells agents to refresh behavior and then continue with the same loop.
- The loop is short enough to be reused in AGENTS snippets and future resume guidance.
- Tests cover the shared rendering and version-sensitive branches.
- The linked project memory stays consistent.
