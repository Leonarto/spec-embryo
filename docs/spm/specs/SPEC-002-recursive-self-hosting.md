+++
doc_kind = "spec"
id = "SPEC-002"
title = "Make Spec Embryo recursive and self-hosting"
summary = "Use Spec Embryo on itself so the tool's own repo is managed through its CLI, managed memory, and agent guidance."
status = "done"
task_ids = ["TASK-004", "TASK-005", "TASK-006"]
tags = ["self-hosting", "workflow", "agents"]
owner = "human-ai"
updated_at = "2026-04-03T16:20:43.739Z"
+++

# Problem

The tool is structurally capable of managing project memory, but the repo itself still needs stronger recursive usage patterns so future agents naturally rely on the CLI and managed memory instead of treating them as optional extras.

# Goals

- Make the Spec Embryo repo use `spm` on itself whenever possible.
- Keep feature planning inside the managed memory home under `docs/spm/`.
- Give agents explicit operational guidance for when and how to use the CLI.
- Expand the product toward spec creation, task creation, and ongoing self-management flows.

# Non-Goals

- Do not force every action through the CLI before the CLI supports it.
- Do not replace deterministic file editing with opaque agent-only behavior.

# Notes

This spec is about self-hosting discipline and roadmap direction. It should make the repo feel increasingly recursive: the tool should help define, track, and update its own future work.
