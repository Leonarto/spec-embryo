+++
doc_kind = "spec"
id = "SPEC-028"
title = "Show omitted changed-item counts in human summary surfaces"
summary = "Make status-style changed-item summaries say when additional changed files were omitted from the visible slice so humans and agents know the list is truncated."
status = "done"
task_ids = ["TASK-082"]
tags = ["git", "status", "ux"]
owner = "human-ai"
updated_at = "2026-04-26T03:39:28.571Z"
+++

# Problem

Status-style changed-item summaries intentionally cap how many entries they render. That keeps the output compact, but once the list is truncated, the human-readable surfaces stop telling the reader that anything was omitted.

That creates a small but real workflow gap:

- a human or agent can mistake the visible list for the complete set of changes
- a managed doc may appear in the visible slice while additional generic files remain hidden without any signal that more context exists
- structured JSON still carries the full list, but the human-oriented text surfaces should explicitly say when they are showing only the first page

Human summary surfaces should add a compact omitted-count note whenever they truncate the underlying changed-item list.

# Goals

- Tell the reader when additional changed items were omitted from a human summary surface.
- Keep the note compact and deterministic.
- Reuse one shared truncation helper across human status-style outputs.
- Leave structured changed-item arrays unchanged.

# Non-Goals

- Do not change the existing 10-item display cap in this slice.
- Do not redesign changed-item summary formatting.
- Do not change JSON or prompt-return structured changed-item arrays.
- Do not add pagination or interactive expansion controls.

# Constraints

- The omitted-count note should only appear when truncation actually happened.
- The human-visible changed-item order from SPEC-027 should remain intact.
- The helper should be shared so `spm status`, deterministic resume text, and resume context-pack summaries stay aligned.

# Proposed Approach

- Add one shared helper that returns:
  - the visible changed-item slice for human output
  - the count of omitted trailing items
- Reuse that helper in human status-style surfaces.
- Append one compact note such as `... and 3 more changed files.` only when items were omitted.
- Add regression coverage that proves the note appears on truncation and stays absent otherwise.

# Detailed Specification

- Keep the human changed-item cap at 10.
- Apply the existing managed-first presentation order before truncation.
- After truncation, if omitted items remain:
  - append one summary line in human-facing surfaces
  - use a deterministic message based on the omitted count
- Apply the note to:
  - `spm status`
  - deterministic backend changed-item text
  - resume context-pack changed-item summaries or deferred inspect-change notes, depending on where the truncation is exposed there
- Leave structured changed-item arrays untouched.

# Edge Cases

- If exactly 10 items exist, no omitted-count note should appear.
- If fewer than 10 items exist, no omitted-count note should appear.
- If all omitted items are unmanaged files, the note should still appear because the visible list is incomplete.

# Acceptance Criteria

- Human `spm status` output shows an omitted-count note when more than 10 changed items exist.
- Deterministic resume text and resume context-pack changed-item summaries surface the same truncation signal where applicable.
- No omitted-count note appears when the full changed-item list is visible.
- Structured changed-item arrays remain unchanged.
- Regression tests cover both truncated and non-truncated cases.

# Open Questions

- None for this slice; the display cap remains fixed and the only change is an explicit truncation signal.
