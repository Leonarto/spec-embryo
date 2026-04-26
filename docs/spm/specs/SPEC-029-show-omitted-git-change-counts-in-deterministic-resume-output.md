+++
doc_kind = "spec"
id = "SPEC-029"
title = "Show omitted git-change counts in deterministic resume output"
summary = "Make the deterministic backend say when additional raw git short-status lines were omitted from the visible Git Changes section so resume text stays explicit about truncation."
status = "active"
task_ids = ["TASK-083"]
tags = ["git", "status", "resume"]
owner = "human-ai"
updated_at = "2026-04-26T03:40:30.740Z"
+++

# Problem

The deterministic backend includes a `Git Changes` section that shows raw `git status --short` lines. Like the human changed-item summaries, it caps that list for readability. Unlike the changed-item summaries after SPEC-028, it does not say when additional lines were omitted.

That creates a mismatch inside the same deterministic resume output:

- the `Changed Items` section can now explicitly signal truncation
- the `Git Changes` section can still silently hide additional raw lines
- a human or agent reading the deterministic resume text can misread the visible raw git list as complete

The deterministic backend should add the same kind of omitted-count note to the raw `Git Changes` section when it truncates that list.

# Goals

- Tell the reader when the deterministic backend omitted additional raw git short-status lines.
- Keep the note compact and deterministic.
- Align the raw `Git Changes` section with the truncation signaling now used by human changed-item summaries.

# Non-Goals

- Do not change `spm status` output in this slice; it does not render a raw `Git Changes` section.
- Do not redesign the deterministic backend output format beyond the omitted-count note.
- Do not change structured git data or structured changed-item arrays.

# Constraints

- Keep the existing visible cap of 10 raw git lines.
- Only show the omitted-count note when truncation actually happened.
- Reuse a small helper or shared pattern rather than open-coding the same count math repeatedly.

# Proposed Approach

- Add one helper for the visible git short-status slice plus omitted-count metadata.
- Use it in the deterministic backend `Git Changes` section.
- Add regression coverage for truncated and non-truncated raw git-change output.

# Detailed Specification

- Keep the deterministic backend's visible `Git Changes` limit at 10.
- When more than 10 raw short-status lines exist:
  - render the first 10 lines
  - append one note such as `... and 3 more git changes.`
- When 10 or fewer raw short-status lines exist:
  - render the visible lines only
  - do not append any omitted-count note
- Leave all structured outputs unchanged.

# Edge Cases

- If exactly 10 raw git lines exist, no omitted-count note should appear.
- If 11 raw git lines exist, the note should say `... and 1 more git change.`
- The note should reflect raw git lines, not managed changed-item count.

# Acceptance Criteria

- Deterministic backend output shows an omitted-count note when the `Git Changes` section is truncated.
- No note appears when the full `Git Changes` list is visible.
- Structured outputs remain unchanged.
- Regression tests cover both singular and plural omitted-count cases.

# Open Questions

- None for this slice; the raw `Git Changes` cap remains fixed and only gains an explicit truncation signal.
