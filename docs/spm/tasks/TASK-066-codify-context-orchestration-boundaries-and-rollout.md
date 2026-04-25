+++
doc_kind = "task"
id = "TASK-066"
title = "Codify context orchestration boundaries and rollout"
summary = "Define how spm should complement Codex and Claude by owning durable project memory, context packaging, and repo-specific guidance without reimplementing model-native reasoning."
status = "done"
spec_ids = ["SPEC-019"]
depends_on = []
blocked_by = []
priority = 1
created_at = "2026-04-25T22:41:41.523Z"
completed_at = "2026-04-25T22:46:28.387Z"
tags = ["context", "docs", "agents", "architecture"]
updated_at = "2026-04-25T22:46:28.387Z"
+++

# Scope

- Write the initial implementation-ready SPEC-019 content so the context work is sequenced and bounded.
- Update README and architecture guidance so future contributors know `spm` should complement Codex and Claude rather than duplicate model-native reasoning.
- Update current state so the managed roadmap clearly points at the context-lifecycle slice and its next implementation task.
- Keep the rollout incremental by defining the later tasks in an order that supports deterministic-only usage first.

# Done Looks Like

- SPEC-019 clearly defines goals, non-goals, constraints, approach, and acceptance criteria.
- Linked follow-up tasks cover compaction, scoped memory, consolidation, evals, retrieval ordering, and prompt-cache-aware packaging.
- Project docs reflect the assistant-sidecar positioning for `spm`.
- The current-state checkpoint and linked memory stay consistent.
