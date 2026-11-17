+++
doc_kind = "spec"
id = "SPEC-044"
title = "Expose workflow loop commands in structured adoption guidance"
summary = "Promote the default SpM workflow loop into shared typed command data so JSON and renderer consumers can learn the resume loop without scraping prose."
status = "done"
task_ids = ["TASK-100"]
tags = ["adoption", "agents", "context", "json"]
updated_at = "2026-04-28T14:28:58.239Z"
+++

# Problem

The adoption contract already exposes structured command guidance for direct agent commands, scoped memory workflow, and doctor modes. The default workflow loop, however, is still represented only as prose steps.

That leaves one more gap for JSON-first consumers: wrappers and downstream renderers can see that the loop exists, but they still have to infer which concrete commands anchor it. The short `spm agent brief` has the same limitation, which makes this part of the contract more fragile than the neighboring structured sections.

# Goals

- Promote workflow-loop command guidance into shared typed adoption data.
- Expose the same structured workflow-loop command list in `spm agent brief --json`.
- Keep human-facing workflow-loop sections aligned with the same shared contract instead of letting prose and JSON drift apart.

# Non-Goals

- Do not remove the existing prose workflow-loop steps that give humans context and branching guidance.
- Do not redesign the workflow loop itself beyond what is needed to expose its command anchors cleanly.
- Do not merge workflow-loop commands into the doctor-mode, direct-command, or memory-workflow sections.

# Proposed Approach

Keep `workflowLoop.steps` as the human-readable narrative contract, but add `workflowLoop.commands` as typed command/reason data derived from the same shared adoption service. The command list should stay additive, handle the current-state-missing branch deterministically, and then flow unchanged into `doctor --json`, `spm agent brief --json`, migration guides, and direct agent briefs.

# Acceptance Criteria

- Shared adoption guidance exposes workflow-loop commands as structured data.
- `spm agent brief --json` includes the same workflow-loop command list.
- Human-facing adoption outputs and the short agent brief render a dedicated workflow-loop command section from the shared field.
- Current-state branching remains deterministic: missing-checkpoint repos can surface `spm init` and `spm current set` in the typed command list without affecting healthy repos.
- Tests cover both the structured field and the rendered workflow-loop command sections.
