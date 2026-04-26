+++
doc_kind = "spec"
id = "SPEC-025"
title = "Surface git change-type hints in changed-item reporting"
summary = "Expose compact git change-type hints alongside changed-item summaries so humans and agents can tell modified, untracked, and renamed work apart without cross-checking raw git output."
status = "done"
task_ids = ["TASK-079"]
tags = ["git", "status", "ux"]
owner = "human-ai"
updated_at = "2026-04-26T02:40:59.960Z"
+++

# Problem

Spec Embryo now reports the right changed paths and, after SPEC-024, shows managed identity plus concrete file path in human-readable summaries. That still leaves one practical gap: the summaries do not tell the reader whether a file is modified, untracked, added, deleted, or renamed.

That makes status-style output less actionable than it could be:

- a human still has to compare `spm status` against raw `git status --short` to understand what kind of change occurred
- a resume bundle can mention a changed spec or task without clarifying whether it is newly created, edited in place, or renamed
- agents lose a cheap prioritization hint when deciding whether to inspect an untracked file, a rename, or a normal edit first

The changed-item layer should carry one compact change-type hint everywhere it already summarizes changed files.

# Goals

- Add one compact git change-type hint to changed-item summaries.
- Keep the hint deterministic and easy to read in terminal-style output.
- Reuse the same hint across `spm status`, deterministic resume text, and compact context-pack summaries.
- Preserve the existing human-friendly identity-plus-path format from SPEC-024.

# Non-Goals

- Do not expose the full staged/unstaged two-column porcelain matrix in this slice.
- Do not redesign the overall `spm status` layout.
- Do not add diff hunks, counts, or file-content previews.
- Do not replace the raw git snapshot stored in the repository layer.

# Constraints

- Prefer one normalized hint per file such as `M`, `A`, `D`, `R`, or `??` over more verbose git internals.
- If a git short-status line contains multiple signals, choose the most meaningful single hint deterministically instead of printing an ambiguous pair.
- Keep unmanaged `other` entries lightweight; they should still read like file-oriented summaries, just with the new change hint.
- Avoid duplicating parsing logic across formatter call sites.

# Proposed Approach

- Extend changed-item derivation so each changed item carries a normalized git change hint derived from the same short-status line used for the path.
- Centralize the normalization rule near the existing git short-status parser so formatting layers consume one stable field.
- Update the shared changed-item formatter to include the hint for both managed and unmanaged items.
- Add regression coverage for common cases such as modified tracked files, untracked files, and rename records.

# Detailed Specification

- Add a new field to `ChangedItemSummary` for the compact git change hint.
- Derive that field directly from the `git status --short` line that produced the item.
- Normalize hints as follows:
  - `??` stays `??` for untracked files.
  - Rename records become `R`.
  - Added records become `A`.
  - Deleted records become `D`.
  - Modified records become `M`.
  - If multiple tracked signals are present, prefer the first meaningful tracked signal in a deterministic way rather than echoing the whole raw pair.
- Render summaries in this shape:
  - managed items: `<hint> <ID>: <Title> (<path>)`
  - unmanaged items: `<hint> <path>`
- Keep JSON and prompt-return surfaces structurally aligned with the new field so downstream agents can consume the same hint without re-parsing strings.

# Edge Cases

- If a short-status line cannot be parsed into a known hint, fall back to a safe tracked placeholder rather than dropping the item.
- If multiple git lines resolve to the same destination path, keep the existing de-duplication behavior and preserve the first derived hint for that path.
- Quoted or escaped paths must continue to decode correctly after the hint parsing is introduced.

# Acceptance Criteria

- Human `spm status` output shows a compact change hint for each changed item.
- Deterministic resume output and context-pack changed-item summaries use the same hint and summary shape.
- Untracked files render with `??`.
- Rename records render with `R`.
- Regression tests cover hint derivation and the updated human-readable strings.

# Open Questions

- None for this slice; the repo will use a single normalized hint rather than the full porcelain pair.
