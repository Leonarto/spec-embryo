+++
doc_kind = "spec"
id = "SPEC-043"
title = "Expose doctor mode commands in structured adoption guidance"
summary = "Promote doctor mode guidance into shared typed command data so JSON and renderer consumers can choose concise, verbose, and JSON doctor flows without scraping prose."
status = "done"
task_ids = ["TASK-099"]
tags = ["adoption", "agents", "doctor", "json"]
updated_at = "2026-04-28T01:05:00.000Z"
+++

# Problem

The adoption surfaces already explain how to use `spm doctor`, but they still do it mostly as prose. JSON and typed consumers can see the broader adoption contract, yet they cannot reliably extract the intended concise, verbose, and JSON doctor paths without scraping sentences.

That leaves another small but important gap in the agent-facing contract: wrappers and downstream renderers should be able to decide when to call `spm doctor`, `spm doctor --verbose`, or `spm doctor --json` from shared typed data, just like they now can for direct agent commands and the scoped memory workflow.

# Goals

- Promote doctor mode guidance into shared typed adoption data.
- Expose the same structured doctor-mode command list in `spm agent brief --json`.
- Keep human-facing doctor-mode sections aligned with the same shared contract instead of letting prose and JSON drift apart.

# Non-Goals

- Do not add new doctor modes in this slice.
- Do not remove the existing prose doctor-mode guidance that helps human readers.
- Do not redesign the broader workflow loop or direct-command sections beyond what is needed to keep doctor-mode discoverability aligned.

# Proposed Approach

Keep the existing prose doctor-mode lines for compatibility and human context, but add a typed doctor-mode command list to the shared adoption guidance model. Then make `spm agent brief --json` and the human renderers consume that same shared field so migration guides, direct agent briefs, and the short agent brief all surface the same command/reason pairs from one source.

# Acceptance Criteria

- Shared adoption guidance exposes doctor-mode commands as structured data.
- `spm agent brief --json` includes the same doctor-mode command list.
- Human renderers use the shared field instead of hand-assembling separate doctor-mode hints.
- Existing prose guidance remains available so the change is additive rather than a breaking removal.
- Tests cover both the structured field and the rendered doctor-mode sections.
