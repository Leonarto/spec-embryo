+++
doc_kind = "spec"
id = "SPEC-059"
title = "Stabilize machine-consumable guidance contracts"
summary = "Make SpM safer as agent infrastructure by versioning structured outputs and testing compatibility across the main JSON guidance surfaces."
status = "proposed"
task_ids = ["TASK-119", "TASK-120"]
tags = ["json", "contracts", "agents", "compatibility"]
updated_at = "2026-05-20T22:12:00Z"
+++

# Overview

This slice turns SpM's growing structured guidance surfaces into an explicit compatibility contract that wrappers, agents, and future UI layers can depend on safely.

# Context

Recent work moved large parts of adoption and workflow guidance into structured JSON. That is valuable, but without an explicit schema lifecycle and compatibility expectations, external consumers still have to infer which fields are stable and when breakage is allowed.

# Goals

- Add an explicit stability contract for machine-consumable JSON outputs.
- Version structured guidance schemas in a deterministic way.
- Add compatibility tests for the most important JSON-first command surfaces.
- Make contract evolution safer for wrappers and agent-sidecar tooling.

# Non-Goals

- Do not freeze every output forever or prevent additive growth.
- Do not create a networked schema registry.
- Do not replace human-readable outputs with JSON-only surfaces.

# Constraints

- Keep the contract understandable to both humans and agent consumers.
- Prefer additive evolution over breaking rewrites.
- Preserve existing command utility for interactive CLI users.
- Avoid inventing format complexity that exceeds the current product needs.

# Proposed Approach

Introduce an explicit schema version and lifecycle policy for structured outputs, then back that policy with compatibility tests that cover core JSON surfaces such as doctor, status, and agent-facing guidance commands.

# Detailed Specification

- Structured command outputs expose a documented schema or contract version.
- The repo documents when additive fields are allowed and when a version bump is required.
- Compatibility tests lock the required portions of core JSON surfaces.
- Shared helpers should generate stable field shapes instead of reassembling similar JSON in multiple places.

# Edge Cases

- Some commands may need partial contract coverage instead of full snapshot locking.
- Experimental fields may need a bounded way to stay out of the stable contract.
- Schema-version changes should not force unnecessary churn on unaffected commands.

# Acceptance Criteria

- SpM documents a clear machine-consumable stability policy.
- Core structured outputs expose a stable version indicator.
- Compatibility tests cover the most important JSON guidance surfaces.
- Future additive changes can happen without accidental contract breakage.

# Open Questions

- None for this planning slice; exact command coverage can be chosen in the tasks.
