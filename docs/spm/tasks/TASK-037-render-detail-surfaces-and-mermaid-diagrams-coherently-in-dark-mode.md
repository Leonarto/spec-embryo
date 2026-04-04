+++
doc_kind = "task"
id = "TASK-037"
title = "Render detail surfaces and Mermaid diagrams coherently in dark mode"
summary = "Adapt detail views, code blocks, and Mermaid theme variables so dark mode feels native instead of bolted on."
status = "done"
spec_ids = ["SPEC-012"]
depends_on = ["TASK-036"]
blocked_by = []
priority = 1
created_at = "2026-04-04T02:29:55.259Z"
completed_at = "2026-04-04T03:06:21.515Z"
tags = []
updated_at = "2026-04-04T03:06:21.515Z"
+++

# Scope

- Carry the shared theme system into spec/task detail views, code blocks, and Mermaid containers.
- Add dark-mode Mermaid treatment so diagrams feel native inside dark detail pages.
- Preserve readability, zoom controls, and viewport behavior while adapting diagram chrome for both modes.
- Finish the theme rollout with the detail-specific surfaces that depend on the shared token refactor from `TASK-036`.

# Done Looks Like

- Detail pages feel coherent in dark and light modes rather than staying as light-paper islands.
- Mermaid diagrams use theme-aware styling in both modes.
- Code and diagram surfaces keep good contrast without sacrificing the workspace visual language.
- The linked project memory stays consistent.
