+++
doc_kind = "spec"
id = "SPEC-030"
title = "Share truncation-note helpers across human summary surfaces"
summary = "Keep omitted-count wording and truncation math aligned across status and deterministic backend text surfaces by moving the logic into shared deterministic helpers."
status = "done"
task_ids = ["TASK-084"]
tags = ["git", "status", "ux", "deterministic"]
owner = "human-ai"
updated_at = "2026-04-26T04:45:00.000Z"
+++

# Problem

Human-facing status-style output now has two separate places that explain truncation:

- changed-item summaries
- the deterministic backend's raw `Git Changes` section

Those surfaces currently duplicate the omitted-count wording and slice math in different files. The behavior is aligned today, but it can drift later if one surface changes phrasing, count logic, or the visible-slice contract without the other.

This is a small but important deterministic invariant. Truncation signaling should be shared rather than reimplemented surface by surface.

# Goals

- Move omitted-count note formatting into shared deterministic helpers.
- Reuse one shared slice helper where human text surfaces cap visible items.
- Keep the existing visible limits and output wording unchanged.
- Reduce the chance of drift between `spm status` and deterministic resume text.

# Non-Goals

- Do not change structured JSON outputs in this slice.
- Do not change visible item limits.
- Do not redesign human changed-item formatting or raw git line formatting.
- Do not add pagination, expansion controls, or new backend sections.

# Constraints

- Existing human-visible wording should stay stable unless a review explicitly changes it.
- Changed-item ordering rules from SPEC-027 must remain intact.
- The helper must stay deterministic and cheap enough for CLI-critical paths.

# Proposed Approach

- Add one generic helper that returns:
  - the visible slice
  - the omitted trailing count
- Add one shared formatter for omitted-count notes given a singular/plural noun.
- Reuse those helpers in:
  - `humanChangedItemSummarySlice`
  - `spm status`
  - deterministic backend `Git Changes`
  - deterministic backend `Changed Items`
- Add regressions for helper behavior plus at least one existing text surface.

# Detailed Specification

- `sliceWithOmittedCount` should:
  - accept an ordered array plus a limit
  - return the visible prefix and the omitted trailing count
- `formatOmittedCountNote` should:
  - return no note when `omittedCount` is `0`
  - produce `... and 1 more <singular>.` for singular
  - produce `... and N more <plural>.` for plural
- `humanChangedItemSummarySlice` should keep its managed-first ordering behavior and delegate the slice math to the shared helper.
- Human text surfaces should call the shared note formatter instead of rebuilding the same string inline.

# Edge Cases

- A limit of `0` should still produce a valid omitted-count result if any items exist.
- Exactly full slices should not render a note.
- Singular and plural nouns must remain correct without forcing callers to reimplement grammar.

# Acceptance Criteria

- `spm status` and deterministic backend text still render the same omitted-count wording as before.
- Shared helpers own the truncation-note formatting and omitted-count math.
- `humanChangedItemSummarySlice` still preserves managed-first ordering.
- Regression tests cover singular, plural, and zero-omission helper behavior.

# Open Questions

- None for this slice; the goal is refactoring for determinism and drift resistance, not changing product behavior.
