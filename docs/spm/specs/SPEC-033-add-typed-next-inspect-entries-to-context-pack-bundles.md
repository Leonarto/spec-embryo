+++
doc_kind = "spec"
id = "SPEC-033"
title = "Add typed next-inspect entries to context-pack bundles"
summary = "Expose typed next-inspect entries in context-pack bundles so prompt-return consumers can tell managed document refs from changed-file paths while preserving the legacy flat id list."
status = "active"
task_ids = ["TASK-087"]
tags = ["context", "resume", "prompt", "ux"]
owner = "human-ai"
updated_at = "2026-04-26T05:25:00.000Z"
+++

# Problem

Context-pack bundles currently expose `nextInspectIds` as a flat string list. That was sufficient when the list only contained managed document ids. After SPEC-032, resume packs can also append changed-file paths.

That mixed string list now loses useful type information:

- prompt-return callers cannot tell whether `SPEC-001` and `scratch-3.md` should be handled the same way
- changed-file paths and managed document ids share the same legacy field even though they expand through different tools and workflows
- the bundle already contains enough structure to preserve that distinction deterministically, but it is not exposed in the direct next-inspect contract

Context-pack bundles should expose a typed next-inspect trail while preserving `nextInspectIds` for compatibility.

# Goals

- Add a typed `nextInspect` structure to context-pack bundles.
- Preserve `nextInspectIds` as a legacy flattened compatibility field.
- Distinguish at least between managed-document refs and changed-file paths.
- Keep typed and flat next-inspect outputs aligned deterministically.

# Non-Goals

- Do not remove `nextInspectIds` in this slice.
- Do not redesign memory-brief bundles.
- Do not add live file-loading behavior or executable expansion actions.
- Do not reorder the existing next-inspect trail beyond what the source bundle already decides.

# Constraints

- Existing callers that only read `nextInspectIds` must keep working unchanged.
- The typed structure must remain compact and JSON-friendly.
- The typed and flat forms must be derived from one source to avoid drift.

# Proposed Approach

- Add a `ContextPackInspectRef` shape with:
  - `kind`
  - `ref`
  - optional `scope`
  - short `note`
- Add `nextInspect` to `ContextPackBundle`.
- For memory packs:
  - map existing doc-id next-inspect values into typed `managed-doc` entries
- For resume packs:
  - map spec/task ids into typed `managed-doc` entries
  - map offloaded changed-file paths into typed `change-path` entries
- Derive the legacy `nextInspectIds` from `nextInspect.map((item) => item.ref)`.

# Detailed Specification

- `ContextPackInspectRef.kind` should initially support:
  - `managed-doc`
  - `change-path`
- `buildMemoryContextPack` should populate `nextInspect` with `managed-doc` entries derived from the existing next-inspect doc ids.
- `buildResumeContextPack` should populate `nextInspect` with:
  - existing spec/task expansion refs as `managed-doc`
  - promoted offloaded changed-file refs as `change-path`
- `nextInspectIds` should remain present and preserve the same order as the typed `nextInspect` entries.

# Edge Cases

- If a ref appears twice through different sources, the typed list should still dedupe deterministically.
- If scope is unknown for a memory-pack managed doc, the entry may omit scope rather than guessing.
- Non-truncated resume packs may still have only `managed-doc` next-inspect entries; that is valid.

# Acceptance Criteria

- Context-pack bundles expose a typed `nextInspect` array.
- `nextInspectIds` remains available and aligned with the typed entries.
- Resume packs use `change-path` entries for promoted changed-file refs.
- Memory packs expose managed-doc next-inspect entries without changing existing retrieval behavior.
- Regression tests cover both memory-pack and resume-pack typed next-inspect behavior.

# Open Questions

- None for this slice; the goal is compatibility-preserving structure, not a redesign of pack expansion semantics.
