+++
doc_kind = "spec"
id = "SPEC-041"
title = "Expose direct agent commands in structured adoption guidance"
summary = "Promote direct agent command guidance into shared typed data so JSON and renderer consumers stay aligned."
status = "active"
task_ids = ["TASK-097"]
tags = ["adoption", "agents", "json"]
updated_at = "2026-04-27T19:52:49.000Z"
+++

# Problem

The direct-command split is now visible in human-rendered adoption surfaces, but JSON and typed consumers still only see that structure implicitly. That means wrapper tooling, downstream renderers, and future refactors still have to rediscover or recompute the direct command list instead of reading it from the same shared guidance object as the human-facing surfaces.

# Goals

- Promote direct agent command guidance into shared typed adoption data.
- Flow the same structured direct-command list into agent-brief JSON and any renderers that already show the section.
- Keep human and machine consumers aligned on one direct-command contract.

# Non-Goals

- Do not add new direct commands in this slice.
- Do not change the wording or behavior of `spm agent brief` or `spm agent snippet`.
- Do not widen the scope into unrelated adoption JSON cleanup beyond the direct-command section.

# Proposed Approach

Add a typed `directAgentCommands` field to the shared adoption guidance model and populate it from the existing shared helper. Then make the adoption renderers and `spm agent brief --json` consume that shared field rather than recomputing or importing the direct command lines separately. Lock the behavior in with JSON-oriented tests.

# Acceptance Criteria

- Shared adoption guidance exposes direct agent commands as structured data.
- Agent brief JSON includes the same direct command list.
- Renderers use the shared field instead of recomputing the section from helper calls.
- Tests cover both the structured data and the rendered sections.
