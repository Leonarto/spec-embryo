+++
doc_kind = "task"
id = "TASK-088"
title = "Add a first-class agent workflow brief command"
summary = "Expose one short deterministic command that teaches an agent how to use SpM in this repo today, especially for resume-heavy and upgrade-aware work."
status = "done"
spec_ids = ["SPEC-034"]
depends_on = []
blocked_by = []
priority = 1
created_at = "2026-04-26T23:34:30.571Z"
completed_at = "2026-04-27T00:26:24.630Z"
tags = ["adoption", "agent-guidance", "cli"]
updated_at = "2026-04-27T00:26:24.630Z"
+++

# Scope

- Define and implement one short first-class SpM command that explains how an agent should use SpM in the current repo today.
- Back the command with shared deterministic guidance data instead of hard-coded prose that would drift from doctor/init guidance.
- Cover the base resume loop, upgrade-aware refresh behavior, and the preferred scoped-memory command workflow.
- Expose a structured output mode so wrappers and other agents do not have to scrape terminal prose.

# Done Looks Like

- A user or agent can run one dedicated SpM command and get a short, actionable "how to work with SpM here" brief.
- The command explains the default loop around `spm status`, `docs/spm/current.md`, `spm memory pack`, and scoped-memory note handling.
- The command has a structured mode suitable for agent consumption.
- Tests cover steady-state and version-drift scenarios.
- The linked project memory stays consistent.
