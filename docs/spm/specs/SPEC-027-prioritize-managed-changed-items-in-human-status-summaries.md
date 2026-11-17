+++
doc_kind = "spec"
id = "SPEC-027"
title = "Prioritize managed changed items in human status summaries"
summary = "Keep status-style changed-item lists more action-oriented by showing managed specs, tasks, current state, and handoffs before generic files without changing structured outputs."
status = "done"
task_ids = ["TASK-081"]
tags = ["git", "status", "ux"]
owner = "human-ai"
updated_at = "2026-04-26T03:16:02.646Z"
+++

# Problem

Changed-item derivation is now fairly rich: human summaries carry identity, path, and normalized change hints, while structured outputs also carry compact raw status codes. The main human status-style surfaces still present changed items in raw git order and then truncate to a small top slice.

That creates a usability gap:

- generic files can crowd managed specs, tasks, current state, or handoffs out of the visible top list
- a human or agent using `spm status` or deterministic resume text may have to scroll or inspect JSON before seeing the managed docs that are most likely to need coordinated updates
- the structured changed-item order is still useful as a raw snapshot, but the human summary layer should be more action-oriented than git's literal sequence

Human-facing changed-item summaries should prioritize managed docs first while leaving the underlying structured order untouched.

# Goals

- Show managed changed items before generic `other` files in human status-style summaries.
- Preserve the existing within-group ordering so the output still feels close to the underlying git snapshot.
- Keep structured changed-item arrays unchanged.
- Reuse one shared ordering helper across human text surfaces.

# Non-Goals

- Do not change the order of `changed_items` in JSON or prompt-return bundles.
- Do not redesign the string format for changed-item summaries.
- Do not hide unmanaged files entirely.
- Do not introduce a user-configurable sorting policy in this slice.

# Constraints

- Sorting should be presentation-only; the canonical changed-item derivation remains git-ordered.
- Managed kinds should stay grouped ahead of `other`, but relative order inside each group should remain stable.
- The helper should be shared so `spm status`, deterministic resume text, and compact context-pack summaries do not diverge.

# Proposed Approach

- Add a small presentation-order helper that takes an existing changed-item list and returns a stable managed-first view.
- Use that ordered view only in human-facing summary surfaces.
- Leave JSON/status snapshot/resume/prompt structured data in original derivation order.
- Add regression coverage that proves an unmanaged file no longer pushes a managed doc behind the human-visible top list.

# Detailed Specification

- Treat these changed-item kinds as managed for human-summary ordering:
  - `current-state`
  - `spec`
  - `task`
  - `handoff`
- Treat `other` as the only unmanaged kind.
- Human-facing changed-item summary order should be:
  1. all managed items in their original relative order
  2. all unmanaged items in their original relative order
- Apply that ordering to:
  - `spm status`
  - deterministic backend changed-item text
  - resume context-pack changed-item summaries and deferred inspect-change notes
- Leave structured changed-item arrays untouched so downstream machine consumers still receive raw derivation order.

# Edge Cases

- If the changed-item list contains only unmanaged files, output order should remain unchanged.
- If the list contains only managed items, output order should remain unchanged.
- If a managed item appears after many unmanaged files in git order, it should still surface earlier in the human summary layer once this presentation sort is applied.

# Acceptance Criteria

- Human `spm status` output lists managed changed items before unmanaged files.
- Deterministic resume text and context-pack changed-item summaries follow the same managed-first presentation order.
- JSON and prompt-return structured changed-item arrays remain in original derivation order.
- Regression tests cover the managed-first human ordering and the preserved structured ordering.

# Open Questions

- None for this slice; the presentation ordering stays fixed and deterministic.
