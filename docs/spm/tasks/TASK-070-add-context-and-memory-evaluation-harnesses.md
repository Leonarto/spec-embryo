+++
doc_kind = "task"
id = "TASK-070"
title = "Add context and memory evaluation harnesses"
summary = "Measure retrieval, injection, consolidation, and context-pack quality so spm context features can improve with evidence instead of intuition."
status = "done"
spec_ids = ["SPEC-019"]
depends_on = ["TASK-066", "TASK-067", "TASK-068", "TASK-069"]
blocked_by = []
priority = 2
created_at = "2026-04-25T22:41:59.585Z"
completed_at = "2026-04-25T23:53:50.410Z"
tags = ["evals", "memory", "context"]
updated_at = "2026-04-25T23:53:50.410Z"
+++

# Scope

- Add lightweight deterministic eval flows for retrieval, context-pack assembly, consolidation quality, and source-of-truth injection.
- Build scenario-style eval coverage that reflects real agent questions rather than only unit-level mechanics.
- Surface metrics or pass/fail signals that help future slices improve context quality with evidence.
- Keep the harness runnable in normal local verification and CI-friendly flows.

# Done Looks Like

- The repo has repeatable eval coverage for the major context lifecycle stages.
- Retrieval, pack quality, and consolidation regressions are catchable before release.
- The eval surface is documented well enough that future context work extends it instead of bypassing it.
- Managed project memory reflects the new evaluation workflow where relevant.
