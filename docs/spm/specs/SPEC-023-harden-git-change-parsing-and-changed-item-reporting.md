+++
doc_kind = "spec"
id = "SPEC-023"
title = "Harden git change parsing and changed-item reporting"
summary = "Make changed-item derivation preserve real relative paths from git short status so status, resume, and context surfaces classify repo changes correctly."
status = "done"
task_ids = ["TASK-077"]
tags = ["git", "status", "resume"]
owner = "human-ai"
updated_at = "2026-04-26T02:02:44.525Z"
+++

# Problem

Spec Embryo derives changed managed items from `git status --short` output and uses that derived list in `spm status`, resume context, and context-pack surfaces. That path extraction is currently lightweight and only implicitly tested for a few plain examples.

That leaves a reliability gap:

- changed-item derivation can regress without a direct test on the reported path values
- git short-status formats such as quoted paths or rename records are easy to mishandle
- if parsing drifts, `spm status` and downstream agent context can classify the wrong file or show a malformed path

Because changed-item reporting influences resume and review behavior, the parser should be treated as deterministic product logic, not a best-effort string trim.

# Goals

- Preserve exact relative paths for normal root files and managed docs from `git status --short`.
- Correctly report the destination path for rename records.
- Handle quoted git paths safely enough that files with spaces or escaped characters do not break changed-item derivation.
- Add focused regression coverage around changed-item path extraction instead of only checking item kinds.

# Non-Goals

- Do not implement a full porcelain-v2 git parser.
- Do not add new UI for changed-item inspection.
- Do not change how git status is collected from the repository layer in this slice.

# Constraints

- Keep the parsing deterministic and local; no shelling out to alternate git formats just for this feature.
- Preserve the existing `ChangedItemSummary` shape so downstream services do not need a migration.
- Prefer a small explicit parser over regex-heavy logic that is hard for future agents to trust.

# Proposed Approach

- Isolate the path extraction logic in `engine.ts` so it can distinguish plain paths, rename records, and quoted path segments.
- Normalize quoted git paths into usable relative paths before matching them against managed docs.
- Expand engine tests so they assert both classification and exact path retention for representative git short-status lines.

# Acceptance Criteria

- `deriveChangedItems` preserves `README.md` exactly for a plain root-file change.
- `deriveChangedItems` uses the destination path from a rename record when matching a managed doc.
- Quoted paths are decoded into usable relative paths for changed-item reporting.
- Regression tests fail if changed-item path extraction drops or mangles characters.
