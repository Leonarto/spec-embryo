+++
doc_kind = "spec"
id = "SPEC-031"
title = "Surface offloaded changed-file counts in resume context packs"
summary = "Make resume context packs explicitly say when changed files were compacted into offloaded detail so prompt-return consumers do not have to infer that from missing entries."
status = "done"
task_ids = ["TASK-085"]
tags = ["context", "resume", "git", "ux"]
owner = "human-ai"
updated_at = "2026-04-26T05:05:00.000Z"
+++

# Problem

Resume context packs intentionally keep only a small number of changed files in active supporting context. Extra changed files are still preserved as offloaded `inspect-change` artifacts, but the pack does not currently say that the visible list was truncated.

That leaves a small clarity gap for prompt-return and subprocess consumers:

- a caller can see three changed files and assume that is the complete changed-file working set
- offloaded `inspect-change` artifacts imply more detail exists, but they do not explicitly frame that as a truncation of the active slice
- status-style human output already gained explicit truncation notes, so resume context packs are the remaining adjacent surface where omission is still implicit

Resume context packs should explicitly say when changed-file detail was compacted out of the active slice.

# Goals

- Surface an explicit omitted-count note when changed files are offloaded from resume context packs.
- Keep the existing three-item visible changed-file cap.
- Preserve the existing per-file offloaded `inspect-change` artifacts.
- Keep prompt-return consumers aligned with the truncation semantics already used in status-style text output.

# Non-Goals

- Do not change the order of changed items in the resume context pack.
- Do not remove or collapse individual `inspect-change` artifacts in this slice.
- Do not redesign prompt-return bundle structure beyond the added explicit note item.
- Do not change raw git `Git Changes` reporting.

# Constraints

- Resume context packs should continue using managed-first changed-item ordering.
- The omission signal should be deterministic and derived from the same shared helper logic used by other truncation surfaces where possible.
- The pack should stay compact; the new signal should be one small item, not another full list.

# Proposed Approach

- Reuse the shared slice and omitted-count helpers while building the resume context pack.
- When changed files are truncated:
  - add one compact supporting item that explicitly says how many additional changed files were offloaded
  - keep the existing visible changed-item entries
  - keep the individual offloaded `inspect-change` artifacts
- Add regression coverage for the new supporting item and the preserved offloaded artifacts.

# Detailed Specification

- Keep the visible changed-file limit in resume context packs at `3`.
- If more than `3` human-ordered changed items exist:
  - include one supporting item with a deterministic omission note such as `... and 2 more changed files.`
  - continue rendering the first `3` changed items as `changed-item` supporting entries
  - continue emitting `inspect-change` offloaded artifacts for the omitted changed files
- If `3` or fewer changed items exist:
  - do not include the omission-note item
- The omission-note item should be clearly distinct from a concrete changed file so consumers can treat it as summary context rather than a file target.

# Edge Cases

- If exactly `3` changed items exist, no omission note should appear.
- If exactly `4` changed items exist, the omission note should use the singular form.
- If all visible changed items are managed docs and the omitted items are generic files, the omission note should still appear because the active slice is incomplete.

# Acceptance Criteria

- Resume context packs explicitly say when changed files were offloaded from the active supporting slice.
- Individual offloaded `inspect-change` artifacts remain present for the omitted files.
- The visible changed-item list stays capped at `3` and keeps its managed-first order.
- Regression tests cover truncated and non-truncated resume pack behavior.

# Open Questions

- None for this slice; the goal is to make existing pack compaction explicit without changing overall pack structure.
