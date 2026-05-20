+++
doc_kind = "task"
id = "TASK-119"
title = "Add a stable schema version for structured guidance"
summary = "Expose an explicit version indicator and lifecycle policy for the core JSON-first guidance surfaces."
status = "todo"
spec_ids = ["SPEC-059"]
depends_on = []
blocked_by = []
priority = 2
created_at = "2026-05-20T22:24:00Z"
tags = []
updated_at = "2026-05-20T22:24:00Z"
+++

# Scope

- Add a documented schema-version concept for structured guidance outputs.
- Define when additive fields are compatible and when a version bump is required.
- Flow the version indicator into the key JSON-first command surfaces.
- Add tests for version presence and lifecycle invariants.

# Done Looks Like

- Wrappers and agents can reason about output stability without guesswork.
- Structured outputs expose a consistent version signal.
- The repo documents the contract evolution policy.
- Tests cover the new versioning invariant.
