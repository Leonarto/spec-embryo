+++
doc_kind = "spec"
id = "SPEC-040"
title = "Separate direct agent commands from snippet guidance"
summary = "Restructure adoption surfaces so direct command discoverability is not buried under snippet-only sections."
status = "done"
task_ids = ["TASK-096"]
tags = ["adoption", "agents", "ux"]
updated_at = "2026-04-27T19:51:00.000Z"
+++

# Problem

The adoption surfaces now teach both `spm agent brief` and `spm agent snippet`, but that discoverability is still embedded inside snippet-oriented sections in several outputs. That makes the guidance harder to scan and blurs two different concepts: direct commands that fetch guidance, and the bounded `AGENTS.md` snippet content itself.

# Goals

- Separate direct command discoverability from the external snippet sections in the longer adoption and agent-facing outputs.
- Keep the snippet sections focused on the snippet content and why it is optional.
- Preserve the same direct command wording while presenting it in a clearer structure.

# Non-Goals

- Do not add new commands or change the behavior of `spm agent brief` or `spm agent snippet`.
- Do not rewrite the snippet content itself in this slice.
- Do not expand concise doctor output further; this slice is about the broader adoption surfaces only.

# Proposed Approach

Introduce a dedicated “Direct agent commands” section in the broader adoption and agent-facing renderers, and remove the command-discoverability lines from the snippet-only sections. Refresh the generated adoption artifacts and update the text-surface tests so the new structure is locked in.

# Acceptance Criteria

- Adoption and agent-facing outputs show direct command discoverability in its own section.
- Snippet sections only describe the bounded snippet and its content.
- Tests cover the new structure instead of merely checking for raw command substrings.
