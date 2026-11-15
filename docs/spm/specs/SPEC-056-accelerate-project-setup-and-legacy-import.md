+++
doc_kind = "spec"
id = "SPEC-056"
title = "Accelerate project setup and legacy import"
summary = "Reduce adoption cost across many repos with seeded project profiles and deterministic import flows for existing planning material."
status = "done"
task_ids = ["TASK-113", "TASK-114"]
tags = ["adoption", "profiles", "import", "migration"]
updated_at = "2026-05-20T17:24:12.458Z"
+++

# Overview

This slice reduces the cost of adopting SpM repeatedly across many repositories. It combines deterministic project profiles for new repos with stronger import and normalization flows for existing planning material.

# Context

Repeated use across many software projects amplifies setup friction. Today the same profile choices, conventions, and migration cleanup steps must be repeated manually, especially in repos that already have issues, ADRs, TODO files, or external planning systems.

# Goals

- Add reusable project profiles for common repo shapes.
- Seed consistent defaults, tags, and guidance from those profiles.
- Add deterministic import and normalization flows for legacy planning material.
- Lower the amount of manual restructuring required before a repo becomes useful in SpM.

# Non-Goals

- Do not build a bidirectional sync engine for third-party systems in this slice.
- Do not introduce hosted templates or remote profile catalogs.
- Do not allow import flows to invent statuses or document shapes outside SpM schemas.

# Constraints

- Keep imported results deterministic and auditable.
- Prefer bounded mappings over magical heuristic migration.
- Preserve the existing local-first adoption workflow and shared doctor/init guidance.
- Keep profiles additive and overrideable per repo.

# Proposed Approach

Introduce a small profile system that can seed repo-local defaults and guidance based on project type, then add deterministic import flows that normalize common legacy artifacts into canonical SpM specs, tasks, and memory structures.

# Detailed Specification

- Profiles cover at least common repo shapes such as library, service, frontend app, and infrastructure repo.
- A profile can influence generated defaults, starter docs, tags, and bounded guidance text.
- Legacy import flows support deterministic normalization from common plain-text and structured planning artifacts into canonical SpM documents.
- Import outputs must surface what was mapped, what was skipped, and what still requires manual review.
- Profiles and imports must coexist; imported repos can still adopt a profile for future defaults.

# Edge Cases

- A repo may adopt a profile after partial manual setup already exists.
- Imported external statuses may not map one-to-one onto SpM statuses.
- Legacy docs may be incomplete or contradictory.
- Some repos may intentionally decline a profile while still using import flows.

# Acceptance Criteria

- SpM can seed at least a small bounded set of deterministic project profiles.
- Imported legacy planning material is normalized into canonical managed docs.
- Import surfaces clearly distinguish mapped, skipped, and review-needed content.
- Profile-driven setup remains compatible with existing init/doctor flows.

# Open Questions

- None for this planning slice; supported import sources can be sequenced task by task.
