+++
doc_kind = "spec"
id = "SPEC-024"
title = "Improve human-facing changed-item reporting"
summary = "Show both managed document identity and concrete relative path in human status-style outputs so repo changes are easier to inspect and reconcile."
status = "done"
task_ids = ["TASK-078"]
tags = ["git", "status", "ux"]
owner = "human-ai"
updated_at = "2026-04-26T02:24:25.719Z"
+++

# Problem

Spec Embryo now derives changed-item paths correctly, but several human-readable surfaces still collapse managed changes down to only an id and title. That makes inspection slower than it needs to be:

- a changed spec or task can be identified conceptually but not located immediately in the repo output
- a user comparing `git status --short` with `spm status` has to mentally map one view to the other
- resume-oriented summaries can drop the concrete file path even when that path is the fastest way to act on the change

Now that the parser is trustworthy, the human-facing summary layer should carry both the managed identity and the concrete relative path.

# Goals

- Show both managed document identity and relative path in human-readable changed-item summaries.
- Keep `other` changed items path-only, since they do not have managed ids.
- Reuse one deterministic formatting rule across status-style outputs so the same changed item is described consistently.

# Non-Goals

- Do not change the JSON schema for changed items.
- Do not redesign the overall `spm status` layout.
- Do not add extra metadata such as git operation codes or diff hunks in this slice.

# Constraints

- Preserve the existing `ChangedItemSummary` structure; this is a presentation-only improvement.
- Keep the human-readable string concise enough for terminal output.
- Avoid duplicating formatting rules across multiple files when a shared formatter is enough.

# Proposed Approach

- Introduce one shared changed-item formatter for human-readable summaries.
- Use it in `spm status`.
- Use the same format in other status-style text surfaces that summarize changed items, such as deterministic resume output and compact context-pack summaries.

# Acceptance Criteria

- Human `spm status` output shows managed changed docs as `ID: Title` plus the concrete relative path.
- Unmanaged `other` changed items still render as paths only.
- Shared text surfaces that summarize changed items stay consistent with the same formatting rule.
- Regression tests cover the rendered human strings.
