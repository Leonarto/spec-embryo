+++
doc_kind = "spec"
id = "SPEC-045"
title = "Promote direct agent guidance into typed command suggestions"
summary = "Expose direct agent command guidance as shared command/reason data so wrappers and renderers can use agent brief and agent snippet discovery without scraping prose."
status = "done"
task_ids = ["TASK-101"]
tags = ["adoption", "agents", "json"]
updated_at = "2026-04-28T14:47:19.522Z"
+++

# Problem

The adoption contract already exposes direct agent guidance as shared text lines, and that was enough to align human renderers and basic JSON consumers. But wrappers and downstream tools still cannot reliably extract the concrete `spm agent brief` and `spm agent snippet` commands, their JSON variants, and the reason to pick each one without scraping natural language.

That makes direct-agent guidance the weakest structured command surface left in the adoption contract. Doctor modes, scoped memory workflow, and the workflow loop already carry typed `command/reason` pairs; direct-agent guidance should reach the same bar.

# Goals

- Add typed direct-agent command suggestions to shared adoption guidance.
- Flow those same suggestions into `spm agent brief --json`.
- Keep the existing text-based direct command lines available so the change stays additive for existing consumers.

# Non-Goals

- Do not remove or rename the existing `directAgentCommands.commands` text lines in this slice.
- Do not add new direct agent surfaces beyond `spm agent brief` and `spm agent snippet`.
- Do not redesign unrelated adoption guidance sections.

# Proposed Approach

Keep the current text lines for compatibility, but add a parallel typed suggestion list for direct-agent commands in the shared adoption guidance model. Populate it from one deterministic helper, then flow it into agent brief JSON and human renderers so the same `command/reason` pairs stay aligned across adoption artifacts, `doctor --json`, and `spm agent brief --json`.

# Acceptance Criteria

- Shared adoption guidance exposes typed direct-agent command suggestions.
- `spm agent brief --json` includes the same direct-agent command suggestions.
- Human-facing adoption outputs and the short agent brief render the same direct-agent suggestions from one shared field.
- Existing text-based direct-agent command lines remain available for compatibility.
- Tests cover both the structured suggestion field and the rendered direct-agent suggestion sections.
