+++
doc_kind = "task"
id = "TASK-039"
title = "Explain spm responsibilities clearly in adoption outputs"
summary = "Teach other LLMs what spm is, when to use it, and which deterministic responsibilities it takes over during repo adoption and ongoing work."
status = "done"
spec_ids = ["SPEC-010"]
depends_on = []
blocked_by = []
priority = 1
owner_role = "planner"
created_at = "2026-04-05T00:30:41.908Z"
completed_at = "2026-04-05T00:32:37.960Z"
tags = ["adoption", "llm", "orientation"]
updated_at = "2026-04-05T00:32:37.960Z"
+++

# Scope

- Extend init/doctor adoption guidance so another LLM gets an explicit explanation of what `spm` is.
- Spell out when an agent should use `spm` instead of relying on ad hoc file inspection or free-form memory reconstruction.
- List the deterministic responsibilities that `spm` takes over so the LLM knows which chores not to improvise.
- Keep the orientation available in both human-readable output and structured JSON guidance.

# Done Looks Like

- Adoption guidance includes a clear `spm` identity and usage model for another LLM.
- Human-readable init/doctor output explains when to use `spm`.
- Structured adoption guidance includes deterministic responsibilities that `spm` already handles.
- Tests lock the new orientation content in place.
