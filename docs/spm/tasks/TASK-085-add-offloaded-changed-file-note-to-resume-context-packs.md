+++
doc_kind = "task"
id = "TASK-085"
title = "Add offloaded changed-file note to resume context packs"
summary = "Make resume context packs explicitly say when changed-file detail was offloaded while preserving visible changed items and per-file inspect-change artifacts."
status = "review"
spec_ids = ["SPEC-031"]
depends_on = []
blocked_by = []
priority = 2
owner_role = "builder"
created_at = "2026-04-26T04:45:00.000Z"
tags = ["context", "resume", "git", "ux"]
updated_at = "2026-04-26T04:45:00.000Z"
+++

# Scope

- Reuse shared truncation helpers in resume context-pack changed-item compaction.
- Add one explicit supporting note when changed files were offloaded.
- Preserve the existing visible changed-item entries and per-file inspect-change artifacts.
- Add focused regressions for truncated and non-truncated resume pack behavior.

# Done Looks Like

- Resume context packs explicitly say when changed files were compacted out of the active slice.
- Offloaded `inspect-change` artifacts still point at each omitted file.
- Existing visible changed-item ordering and cap stay stable.
- The linked project memory stays consistent.
