+++
doc_kind = "task"
id = "TASK-075"
title = "Add version-aware doctor capability refresh guidance"
summary = "Teach doctor and adoption artifacts to surface newer SpM memory capabilities and tell upgraded agents to refresh repo-local usage policy before continuing work."
status = "done"
spec_ids = ["SPEC-021"]
depends_on = []
blocked_by = []
priority = 1
owner_role = "builder"
created_at = "2026-04-26T00:46:23.050Z"
completed_at = "2026-04-26T01:12:31.222Z"
tags = ["adoption", "doctor", "memory"]
updated_at = "2026-04-26T01:12:31.222Z"
+++

# Scope

- Extend adoption guidance with a structured capability-refresh section that can be rendered into doctor verbose output, doctor JSON, migration guides, and direct agent briefs.
- Teach the current scoped-memory workflow explicitly, including `spm memory note`, `spm memory scopes`, and `spm memory consolidate`.
- Strengthen the upgrade path so a newer CLI version tells agents to refresh their SpM usage policy and repo-local guidance before continuing work.
- Add tests for guidance structure, rendered brief content, and doctor upgrade reporting.

# Done Looks Like

- `doctor --verbose` and `doctor --json` both expose enough guidance for an upgraded agent to switch to the newer memory workflow.
- The direct agent brief and migration guide tell agents not to hand-edit scoped note files when the `memory note` lifecycle commands are available.
- Upgrade findings and recommended commands clearly distinguish "refresh guidance/capabilities" from generic rerun advice.
- Tests cover both steady-state and upgrade-detected behavior.
- The linked project memory stays consistent.
