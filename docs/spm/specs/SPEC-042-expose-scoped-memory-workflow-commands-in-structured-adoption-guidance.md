+++
doc_kind = "spec"
id = "SPEC-042"
title = "Expose scoped memory workflow commands in structured adoption guidance"
summary = "Promote memory workflow guidance into shared typed command data so JSON and renderer consumers can learn session-note flows without scraping prose."
status = "done"
task_ids = ["TASK-098"]
tags = ["adoption", "agents", "memory", "json"]
updated_at = "2026-04-27T22:05:00.000Z"
+++

# Problem

The adoption and agent-facing surfaces now expose direct SpM command discovery as shared typed data, but the scoped memory workflow still reaches JSON consumers mostly as prose. That means wrapper tooling and downstream renderers can see that a memory workflow exists, but they still have to scrape sentences to recover the actionable command set for session capture, scope inspection, and consolidation.

This matters because the memory workflow is one of the higher-value changes in recent SpM releases. If agents or wrappers cannot retrieve that command set deterministically, they are more likely to fall back to stale habits such as raw file edits or to skip the newer memory-note flow entirely.

# Goals

- Promote the scoped memory workflow command set into shared typed adoption guidance.
- Expose the same command list in `spm agent brief --json`.
- Keep human renderers aligned with that shared memory-workflow contract instead of letting command discoverability drift apart from JSON surfaces.

# Non-Goals

- Do not add new memory commands in this slice.
- Do not remove the existing prose memory-workflow guidance that still helps human readers.
- Do not redesign the broader workflow loop or direct-agent-command sections beyond what is needed to keep the contracts aligned.

# Proposed Approach

Keep the existing `preferredWorkflows` prose list for compatibility and human context, but add a typed list of memory-workflow command suggestions to the shared adoption guidance model. Then flow that same list into `spm agent brief --json` and use it in the human-facing renderers so migration guides, direct agent briefs, and the agent brief all surface the same command/reason pairs from one source.

# Acceptance Criteria

- Shared adoption guidance exposes scoped memory workflow commands as structured data.
- `spm agent brief --json` includes the same structured memory-workflow command list.
- Human renderers use the shared field instead of hand-assembling separate memory command hints.
- Existing prose guidance remains available so the change is additive rather than a breaking removal.
- Tests cover both the structured field and the rendered surfaces.
