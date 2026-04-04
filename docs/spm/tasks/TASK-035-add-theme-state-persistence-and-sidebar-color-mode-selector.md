+++
doc_kind = "task"
id = "TASK-035"
title = "Add theme state, persistence, and sidebar color-mode selector"
summary = "Introduce system/dark/light theme state, persist the selection locally, and place the selector near the bottom of the left sidebar."
status = "done"
spec_ids = ["SPEC-012"]
depends_on = []
blocked_by = []
priority = 1
created_at = "2026-04-04T02:29:54.458Z"
completed_at = "2026-04-04T02:38:26.169Z"
tags = []
updated_at = "2026-04-04T02:38:26.169Z"
+++

# Scope

- Add a shared client-side color-mode model with `system`, `dark`, and `light`.
- Persist the selected mode locally and restore it on future visits.
- Resolve `system` deterministically, with fallback to dark when browser preference cannot be read.
- Add a compact color-mode selector near the bottom of the persistent left sidebar.
- Apply the resolved theme at the app-shell level so the workspace chrome reacts immediately when the mode changes.

# Done Looks Like

- The workspace remembers the selected color mode across reloads.
- The left sidebar exposes a visible selector for `system`, `dark`, and `light`.
- The first rendered frame avoids obvious light/dark flashing.
- The shell responds to the selected mode without waiting for later theme-refactor slices.
- The linked project memory stays consistent.
