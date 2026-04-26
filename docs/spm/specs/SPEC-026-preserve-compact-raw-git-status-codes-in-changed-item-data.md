+++
doc_kind = "spec"
id = "SPEC-026"
title = "Preserve compact raw git status codes in changed-item data"
summary = "Expose the compact raw git short-status code alongside normalized hints so structured changed-item consumers can distinguish mixed states without reparsing git output."
status = "done"
task_ids = ["TASK-080"]
tags = ["git", "status", "ux"]
owner = "human-ai"
updated_at = "2026-04-26T02:59:06.353Z"
+++

# Problem

SPEC-025 added one normalized `changeHint` to changed-item summaries, which makes human-facing output much easier to scan. That normalization is intentionally lossy: it collapses git's two-column short-status representation down to one compact hint such as `M`, `R`, or `??`.

That is the right tradeoff for terminal summaries, but structured consumers still lose useful detail:

- an agent reading JSON or prompt-return bundles cannot distinguish `M`, `MD`, and `MM` without reparsing raw `git status --short`
- mixed tracked states such as staged-plus-working-tree changes are flattened before structured context can use them
- downstream tooling has to choose between relying on the simplified human summary or independently re-deriving git semantics from the raw snapshot

The changed-item model should preserve one compact raw status code alongside the normalized hint so machine consumers retain nuance without making human summaries noisier.

# Goals

- Add a compact raw git status code to structured changed-item data.
- Keep existing human-readable changed-item summaries unchanged from SPEC-025.
- Reuse one derivation path so normalized hints and raw codes cannot drift apart.
- Make JSON and prompt-return consumers able to distinguish mixed tracked states without reparsing raw git output.

# Non-Goals

- Do not expose the full original `git status --short` line in changed-item summaries.
- Do not redesign human `spm status` formatting.
- Do not replace the normalized `changeHint`; this slice complements it.
- Do not add a new git abstraction beyond the changed-item data already derived in the engine.

# Constraints

- Preserve the compact shape of human-facing summaries from SPEC-025.
- The new structured field should be deterministic and derived from the same parsed status token as `changeHint`.
- Handle both normal two-column short-status records and already-trimmed one-column tracked records safely.
- Avoid adding parallel parsing logic in commands or backends.

# Proposed Approach

- Extend the parsed git-status record in the engine to carry both:
  - one normalized display hint for human summaries
  - one compact raw status code for structured consumers
- Add that raw status code to `ChangedItemSummary`.
- Keep `formatChangedItemSummary` based on `changeHint`, not the raw code.
- Add regression coverage for raw-code preservation on normal modified, untracked, rename, and mixed tracked states.

# Detailed Specification

- Add a new `statusCode` field to `ChangedItemSummary`.
- Derive `statusCode` as a compact git short-status token:
  - `??` for untracked files
  - `M` for a simple modified tracked record like ` M`
  - `MD` for mixed tracked states like `MD`
  - `R` for simple rename records like `R `
- Continue deriving `changeHint` from the same status token, with human-friendly normalization left unchanged.
- Keep human summary rendering in this shape:
  - managed items: `<hint> <ID>: <Title> (<path>)`
  - unmanaged items: `<hint> <path>`
- Let JSON/status snapshot/resume/prompt consumers see both `changeHint` and `statusCode`.

# Edge Cases

- If a tracked line arrives already trimmed to one visible column, keep `statusCode` as that compact single-character value.
- If a status token contains spaces around a visible tracked code, compact it deterministically rather than preserving alignment whitespace.
- Quoted and rename paths must continue to decode exactly as before.

# Acceptance Criteria

- `ChangedItemSummary` includes both `changeHint` and `statusCode`.
- Mixed tracked statuses preserve their compact raw code in structured outputs.
- Human-facing changed-item summaries remain unchanged from SPEC-025.
- Regression tests cover raw-code preservation for modified, renamed, untracked, and mixed tracked examples.

# Open Questions

- None for this slice; the repo will preserve compact raw codes for structured use while keeping human summaries normalized.
