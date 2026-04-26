+++
doc_kind = "task"
id = "TASK-086"
title = "Promote offloaded changed-file refs into resume next-inspect ids"
summary = "Append the highest-value offloaded changed-file refs to resume-pack `nextInspectIds` so prompt-return callers can expand directly into omitted changed-file detail."
status = "review"
spec_ids = ["SPEC-032"]
depends_on = []
blocked_by = []
priority = 2
owner_role = "builder"
created_at = "2026-04-26T05:05:00.000Z"
tags = ["context", "resume", "git", "ux"]
updated_at = "2026-04-26T05:05:00.000Z"
+++

# Scope

- Reuse offloaded `inspect-change` artifacts while building resume-pack `nextInspectIds`.
- Append a small number of omitted changed-file refs after the existing spec/task next-inspect entries.
- Keep the current cap and existing ordering for spec/task refs.
- Add focused regressions for the truncated changed-file case.

# Done Looks Like

- Resume packs with omitted changed files expose those file refs through `nextInspectIds`.
- Existing spec/task next-inspect refs still come first.
- Non-truncated packs preserve the previous behavior.
- The linked project memory stays consistent.
