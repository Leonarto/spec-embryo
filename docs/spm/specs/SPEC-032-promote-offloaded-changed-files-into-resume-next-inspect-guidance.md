+++
doc_kind = "spec"
id = "SPEC-032"
title = "Promote offloaded changed files into resume next-inspect guidance"
summary = "Make resume context packs include the highest-value offloaded changed-file refs in `nextInspectIds` so prompt-return callers can expand directly into the omitted file trail."
status = "active"
task_ids = ["TASK-086"]
tags = ["context", "resume", "git", "ux"]
owner = "human-ai"
updated_at = "2026-04-26T05:05:00.000Z"
+++

# Problem

Resume context packs now explicitly say when changed files were compacted out of the active slice, and they preserve per-file `inspect-change` artifacts for each omitted file. However, `nextInspectIds` still only points at active specs, active tasks, and ready tasks.

That leaves the expansion trail incomplete for prompt-return consumers:

- the pack explains that changed files were offloaded
- the artifact list contains the omitted file paths
- but the primary "inspect this next" list does not promote those changed files into the next-step path

Callers that rely on `nextInspectIds` as the compact expansion order still have to rediscover the omitted changed-file trail themselves.

# Goals

- Include the highest-value offloaded changed-file refs in resume-pack `nextInspectIds`.
- Keep existing spec/task next-inspect refs intact and ahead of changed-file refs.
- Reuse the already-built offloaded `inspect-change` set instead of recomputing a second changed-file candidate list.
- Keep the result compact and deterministic.

# Non-Goals

- Do not redesign `nextInspectIds` into a typed structure in this slice.
- Do not remove per-file offloaded artifacts.
- Do not change memory-brief `nextInspectIds`.
- Do not change visible changed-item or offloaded-artifact ordering.

# Constraints

- Active specs and active tasks should still take precedence in `nextInspectIds`.
- Offloaded changed-file refs should only be included when they actually exist.
- The overall `nextInspectIds` cap should remain unchanged.

# Proposed Approach

- Build the resume-pack offloaded artifacts first.
- Derive the top omitted changed-file refs from the `inspect-change` artifacts.
- Append a small number of those refs after the existing spec/task entries in `nextInspectIds`.
- Add regression coverage that proves truncated changed-file packs include omitted file refs in the next-inspect trail.

# Detailed Specification

- Keep the existing `nextInspectIds` cap at `8`.
- Preserve the existing leading order:
  - active specs
  - active tasks
  - first ready tasks
- After those, append up to `2` offloaded changed-file refs from `inspect-change` artifacts.
- Use set semantics so a duplicate ref only appears once.
- If no changed files were offloaded, `nextInspectIds` should remain unchanged from the prior behavior.

# Edge Cases

- If the `nextInspectIds` cap is reached before changed-file refs are appended, omitted changed files may still be absent; the artifact list remains the fallback detail surface.
- If there is only one offloaded changed file, include only that ref.
- If changed-item refs overlap with existing next-inspect values, the deduped list should remain stable.

# Acceptance Criteria

- Resume context packs with offloaded changed files include those file refs in `nextInspectIds`.
- Existing spec/task next-inspect refs stay ahead of the changed-file refs.
- Non-truncated resume packs keep the prior next-inspect behavior.
- Regression tests cover the truncated changed-file case.

# Open Questions

- None for this slice; it extends the existing string-based `nextInspectIds` contract instead of redesigning it.
