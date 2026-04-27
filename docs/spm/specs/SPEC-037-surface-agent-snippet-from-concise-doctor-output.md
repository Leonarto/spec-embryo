+++
doc_kind = "spec"
id = "SPEC-037"
title = "Surface agent snippet from concise doctor output"
summary = "Teach default spm doctor output to mention the direct agent snippet path when callers only need bounded external AGENTS guidance."
status = "done"
task_ids = ["TASK-093"]
tags = ["adoption", "doctor", "agents"]
updated_at = "2026-04-27T14:45:12.000Z"
+++

# Problem

`spm agent snippet` now exists as the narrowest way to retrieve the bounded external `AGENTS.md` guidance, but the default concise `spm doctor` output still only points callers at `doctor --verbose` and `doctor --json`. That means humans and wrapper tooling that start with the cheap doctor check can still miss the purpose-built snippet command and jump to broader surfaces than they actually need.

# Goals

- Make the default `spm doctor` output advertise `spm agent snippet` when callers only need the bounded external guidance.
- Keep the concise doctor wording aligned with the shared adoption wording instead of inventing another drift path.
- Preserve the cheap non-verbose doctor shape while improving snippet discoverability.

# Non-Goals

- Do not replace `doctor --verbose` as the path for the full adoption guide and direct agent brief.
- Do not change the snippet content itself in this slice.
- Do not add new write behavior, AGENTS auto-application, or broader adoption workflow changes here.

# Proposed Approach

Reuse the shared `spm agent snippet` wording that already feeds the broader adoption surfaces, and thread it into the concise `renderDoctorReport()` branch. Then update the doctor regression coverage so the cheap default output is explicitly locked to the new discoverability contract.

# Acceptance Criteria

- Default non-verbose `spm doctor` output points callers at `spm agent snippet` when they only need bounded external `AGENTS.md` guidance.
- The wording stays aligned with the shared adoption helper instead of drifting into a command-local phrasing.
- Tests cover the concise doctor surface so the hint does not regress.
