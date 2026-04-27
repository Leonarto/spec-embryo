+++
doc_kind = "task"
id = "TASK-097"
title = "Add structured direct-agent-command guidance to adoption outputs"
summary = "Expose the direct agent command list in shared guidance and agent brief JSON instead of leaving it as render-only text."
status = "review"
spec_ids = ["SPEC-041"]
depends_on = []
blocked_by = []
priority = 2
created_at = "2026-04-27T19:51:59.094Z"
tags = []
updated_at = "2026-04-27T19:52:49.000Z"
+++

# Scope

- Add a typed `directAgentCommands` field to the shared adoption guidance model.
- Flow that field into the agent-brief JSON payload and switch renderers to read from it.
- Extend tests to validate both the structured field and the human-rendered direct-command sections.

# Done Looks Like

- Adoption guidance exposes direct agent commands as shared structured data.
- Agent brief JSON includes the direct command list without text scraping.
- Renderers stay aligned by consuming the shared field.
- The expected behavior is implemented and verified.
- The linked project memory stays consistent.
