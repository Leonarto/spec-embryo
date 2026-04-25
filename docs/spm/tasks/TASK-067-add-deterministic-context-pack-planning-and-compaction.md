+++
doc_kind = "task"
id = "TASK-067"
title = "Add deterministic context-pack planning and compaction"
summary = "Build compact context-pack flows that offload large detail into durable artifacts, expose progressive disclosure, and keep active prompts small and explicit."
status = "todo"
spec_ids = ["SPEC-019"]
depends_on = ["TASK-066"]
blocked_by = []
priority = 1
created_at = "2026-04-25T22:41:46.493Z"
tags = ["context", "memory", "cli", "retrieval"]
updated_at = "2026-04-25T22:56:00.000Z"
+++

# Scope

- Define a first-class context-pack concept for implementation, review, migration, and resume flows.
- Add deterministic pack assembly that favors section-level extraction, explicit inclusion reasons, and progressive disclosure over whole-document dumps.
- Add compaction rules that offload large supporting detail into durable artifacts instead of forcing it into active prompts.
- Ensure the feature works in deterministic and prompt-return flows before any provider-specific backend optimization.

# Done Looks Like

- A user or agent can ask `spm` for a compact context pack suited to a work mode.
- Large supporting detail can be referenced or offloaded deterministically instead of always inlined.
- Tests cover pack assembly, compaction behavior, and stable output contracts.
- Related docs and managed memory stay aligned with the new flow.
