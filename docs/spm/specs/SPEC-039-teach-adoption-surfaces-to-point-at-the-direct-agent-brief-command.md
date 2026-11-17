+++
doc_kind = "spec"
id = "SPEC-039"
title = "Teach adoption surfaces to point at the direct agent brief command"
summary = "Make broader adoption outputs explicitly mention the direct agent brief command when callers want the current repo workflow without the full verbose guide."
status = "done"
task_ids = ["TASK-095"]
tags = ["adoption", "agents", "external-repos"]
updated_at = "2026-04-27T19:35:01.000Z"
+++

# Problem

SpM now exposes `spm agent brief` as the short steady-state “how to use SpM here today” surface, and concise `spm doctor` already points at it. But the broader adoption surfaces still mostly teach the snippet path and the verbose doctor path instead of explicitly pointing at the direct `spm agent brief` command. That leaves a discoverability gap for humans and wrapper agents that are already reading the migration and adoption outputs but want the shorter repo-workflow command.

# Goals

- Teach the broader adoption surfaces to mention `spm agent brief` when callers want the current repo workflow without the full verbose guide.
- Reuse the same shared wording already used by concise doctor instead of inventing another phrase.
- Keep `spm agent brief` positioned as a shorter steady-state surface, not as a separate adoption system.

# Non-Goals

- Do not change the `spm agent brief` command behavior itself in this slice.
- Do not demote `doctor --verbose` when the full adoption guide or direct agent brief is actually needed.
- Do not change the bounded `spm agent snippet` contract beyond mentioning `spm agent brief` alongside it where appropriate.

# Proposed Approach

Thread the shared `spm agent brief` command lines through the broader adoption renderers that already discuss doctor modes and the snippet path: the verbose adoption guide, the migration guide, the direct agent brief, and the steady-state `spm agent brief` output. Then update the text-surface tests so the discoverability contract stays aligned.

# Acceptance Criteria

- Broader adoption outputs mention `spm agent brief` as the direct current-workflow command.
- The wording is shared with concise doctor rather than copied into one-off strings.
- Tests cover the affected adoption and agent-facing surfaces.
