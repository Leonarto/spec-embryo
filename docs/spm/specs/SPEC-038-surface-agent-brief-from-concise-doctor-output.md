+++
doc_kind = "spec"
id = "SPEC-038"
title = "Surface agent brief from concise doctor output"
summary = "Teach default spm doctor output to mention the direct agent brief path when callers need the current repo workflow without jumping to verbose mode."
status = "done"
task_ids = ["TASK-094"]
tags = ["adoption", "doctor", "agents"]
updated_at = "2026-04-27T18:19:40.000Z"
+++

# Problem

Concise `spm doctor` now points callers at `spm agent snippet` for the narrow bounded-`AGENTS.md` path, but it still does not point at `spm agent brief`, which is the better surface when an agent needs the repo's current SpM workflow without the full verbose adoption guide. That leaves a discoverability gap between the cheapest doctor output and the full adoption surface.

# Goals

- Make default `spm doctor` output mention `spm agent brief` when callers need the current repo workflow without the long adoption guide.
- Keep the concise doctor wording aligned with shared adoption helpers instead of adding another command-local phrase.
- Preserve the cheap default doctor output while making the middle-sized agent workflow surface easier to discover.

# Non-Goals

- Do not replace `doctor --verbose` as the path for the full adoption guide and direct agent brief.
- Do not change the behavior or content of `spm agent brief` itself in this slice.
- Do not widen this slice into new adoption workflows beyond concise discoverability.

# Proposed Approach

Add shared `spm agent brief` discoverability wording alongside the existing snippet wording in the adoption service, then reuse it in the concise `renderDoctorReport()` branch. Update doctor tests and the adoption-facing docs that describe concise doctor behavior so the new middle-sized path stays explicit.

# Acceptance Criteria

- Default non-verbose `spm doctor` output points callers at `spm agent brief` for the current repo workflow surface.
- The wording comes from a shared helper that keeps concise doctor aligned with other adoption surfaces.
- Tests and product docs reflect the new concise doctor discoverability path.
