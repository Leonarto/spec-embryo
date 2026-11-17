+++
doc_kind = "spec"
id = "SPEC-057"
title = "Strengthen resume and retrieval control"
summary = "Improve interruption recovery and large-repo memory quality with explicit resume flows and configurable retrieval ranking controls."
status = "done"
task_ids = ["TASK-115", "TASK-116"]
tags = ["resume", "retrieval", "memory", "ranking"]
updated_at = "2026-05-20T17:24:15.587Z"
+++

# Overview

This slice improves how SpM helps users and agents recover after interruption and how it chooses the most relevant managed memory when repos become larger and denser.

# Context

SpM already has strong current-state, handoff, and memory-pack foundations, but repeated use across long-lived repos exposes two remaining gaps: restart workflows still require too much manual judgment, and retrieval quality will degrade as managed memory grows unless ranking becomes configurable and explicit.

# Goals

- Add first-class resume flows for interruption recovery.
- Make resume behavior aware of recency, git activity, and prior handoff state.
- Add deterministic ranking controls for memory query, brief, and pack surfaces.
- Improve precision in larger repos without relying on model-native guesswork.

# Non-Goals

- Do not replace current state, handoffs, or memory packs with opaque summaries.
- Do not add model-specific retrieval behavior as the default path.
- Do not introduce semantic vector search as a hard dependency in this slice.

# Constraints

- Keep the default path deterministic and inspectable.
- Preserve existing current-state and memory-pack flows as the foundation.
- Make ranking behavior explicit enough that agents can reason about why results appeared.
- Avoid duplicating capabilities that Codex or Claude already handle natively inside the model.

# Proposed Approach

Add explicit resume commands and interruption-aware guidance on top of the existing current-state and handoff system, then extend memory retrieval surfaces with deterministic ranking controls that favor the most relevant scope, recency, and workflow proximity signals.

# Detailed Specification

- Resume flows can summarize what changed since a prior checkpoint, handoff, commit, or time window.
- Resume outputs can point at the highest-value next steps without requiring the caller to reconstruct the loop manually.
- Retrieval controls can prioritize signals such as active-task proximity, current-state proximity, recency, tag overlap, or handoff relevance.
- Retrieval outputs should expose enough metadata to explain ranking and filtering decisions.
- The same control surface should be usable from CLI flows and JSON-first agent consumers.

# Edge Cases

- Repos with no prior handoff should still have a deterministic resume path.
- Git history may be unavailable or shallow in some environments.
- Over-tuned ranking controls should not make common-case retrieval unusable.
- Session notes, repo memory, and org memory may need different default weighting.

# Acceptance Criteria

- SpM has a first-class interruption-recovery workflow beyond manual current-state reading.
- Resume outputs can incorporate git- and handoff-aware change windows.
- Retrieval ranking controls exist and are inspectable.
- Ranking changes improve large-repo memory selection without breaking existing deterministic flows.

# Open Questions

- None for this planning slice; exact control surfaces can be staged through the tasks.
