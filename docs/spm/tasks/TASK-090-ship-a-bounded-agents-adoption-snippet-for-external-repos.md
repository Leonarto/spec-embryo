+++
doc_kind = "task"
id = "TASK-090"
title = "Ship a bounded AGENTS adoption snippet for external repos"
summary = "Provide a short deterministic AGENTS snippet that makes upgraded agents check the right SpM surfaces before multi-step or resume-heavy work."
status = "in_progress"
spec_ids = ["SPEC-034"]
depends_on = ["TASK-088", "TASK-089"]
blocked_by = []
priority = 2
created_at = "2026-04-26T23:34:52.642Z"
tags = ["adoption", "agents", "external-repos"]
updated_at = "2026-04-27T00:51:39.615Z"
+++

# Scope

- Define a short external-repo AGENTS snippet that nudges agents toward the right SpM entrypoints before multi-step or resume-heavy work.
- Keep the snippet compatible with host repos that already have strong AGENTS guidance and do not want SpM to take over the whole instruction layer.
- Make the snippet consistent with the new first-class workflow brief and the doctor/init adoption contract.
- Decide whether SpM should generate the snippet directly, expose it in doctor/init output, or both.

# Done Looks Like

- External repos have a concise SpM snippet available that points agents toward `spm status`, `docs/spm/current.md`, and `spm memory pack` only when justified.
- The snippet does not require Nexus or prompt-return mode by default.
- Tests or deterministic rendering checks cover the snippet contract.
- The linked project memory stays consistent.
