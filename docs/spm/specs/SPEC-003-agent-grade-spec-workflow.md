+++
doc_kind = "spec"
id = "SPEC-003"
title = "Establish an agent-grade spec writing and review workflow"
summary = "Create durable skills and repo policy for writing specs that are optimized for LLM implementation, iterated with the human user, reviewed, and fixed before coding."
status = "done"
task_ids = ["TASK-007", "TASK-008", "TASK-013"]
tags = ["specs", "workflow", "agents"]
owner = "human-ai"
updated_at = "2026-04-03T16:20:43.855Z"
+++

# Problem

If specs are written inconsistently, implementation agents will guess. If specs are not reviewed critically before coding, ambiguity and hidden assumptions will survive too long.

# Goals

- Standardize a spec-writing workflow that is optimized for LLM implementation.
- Require user iteration on the most consequential decisions before finalizing a spec.
- Require review and fix steps before treating a spec as ready.
- Keep the workflow readable and lightweight enough to use repeatedly.

# Non-Goals

- Do not force one single prose style for every document.
- Do not turn every small note into a full formal spec.

# Proposed Approach

Create two repo-local skills:

- `spec-writer`
- `spec-reviewer`

Then enforce the workflow in AGENTS guidance:

1. draft
2. iterate core decisions with the human user
3. review
4. fix

# Acceptance Criteria

- The repo contains a `spec-writer` skill.
- The repo contains a `spec-reviewer` skill.
- Root and local AGENTS guidance tells agents to use this workflow when writing or materially revising specs.
- The workflow is explicit enough that another Codex-like agent can follow it without guessing.
