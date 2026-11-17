+++
doc_kind = "spec"
id = "SPEC-036"
title = "Teach adoption surfaces to point at the direct agent snippet command"
summary = "Make doctor, agent brief, and adoption artifacts explicitly mention the direct snippet command when callers want only bounded AGENTS guidance."
status = "done"
task_ids = ["TASK-092"]
tags = ["adoption", "agents", "external-repos"]
updated_at = "2026-04-27T03:06:40.520Z"
+++

# Problem

SpM now has `spm agent snippet`, but the broader adoption surfaces that humans and agents already read do not explicitly point at it. That means callers who only need the bounded external `AGENTS.md` guidance can still end up reading or scraping larger outputs like `doctor --verbose`, migration guides, or the full agent brief even though a narrower direct command now exists.

# Goals

- Teach the broader adoption surfaces to mention `spm agent snippet` when callers only need the bounded external `AGENTS.md` guidance.
- Keep the wording shared and deterministic instead of adding one-off command mentions in unrelated handlers.
- Position `spm agent snippet` as the narrow additive path, not as a second adoption workflow.

# Non-Goals

- Do not change the snippet content itself in this slice.
- Do not demote `spm agent brief`, `doctor --verbose`, or migration artifacts when broader adoption context is actually needed.
- Do not add write behavior or AGENTS auto-application to the snippet command.

# Proposed Approach

Thread one shared “use `spm agent snippet` when you only need the bounded guidance” hint through the adoption surfaces that already render or discuss the snippet:

1. the verbose adoption guide rendered by `doctor`
2. the migration guide and direct agent brief artifacts
3. the steady-state `spm agent brief` output

The hint should come from shared service-layer wording so the repo does not grow a new drift path.

# Acceptance Criteria

- `doctor --verbose`, migration artifacts, and `spm agent brief` all mention `spm agent snippet` as the narrow retrieval path for bounded external `AGENTS.md` guidance.
- The command remains described as read-only and additive rather than as a second adoption system.
- Tests cover the new discoverability wording on the relevant text surfaces.
