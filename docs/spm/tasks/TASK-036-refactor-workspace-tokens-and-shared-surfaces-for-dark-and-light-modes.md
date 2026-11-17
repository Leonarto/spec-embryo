+++
doc_kind = "task"
id = "TASK-036"
title = "Refactor workspace tokens and shared surfaces for dark and light modes"
summary = "Replace light-only tokens with theme-aware variables and audit the shell, dashboard, board, specs, and timeline for intentional dual-mode styling."
status = "done"
spec_ids = ["SPEC-012"]
depends_on = ["TASK-035"]
blocked_by = []
priority = 1
created_at = "2026-04-04T02:29:55.130Z"
completed_at = "2026-04-04T02:57:33.611Z"
tags = []
updated_at = "2026-04-04T02:57:33.611Z"
+++

# Scope

- Replace remaining light-only surface decisions with shared theme-aware tokens.
- Audit the shell, dashboard, kanban, specs, timeline, and shared controls for dual-mode readability.
- Tune borders, glows, shadows, and atmosphere so dark mode looks intentional rather than inverted.
- Keep shared workspace surfaces consistent enough that later detail-view and Mermaid dark-mode work can build on them cleanly.

# Done Looks Like

- The main workspace routes render coherently in both dark and light modes.
- Shared cards, pills, rails, and top-level surfaces draw from reusable theme tokens.
- No major workspace view still depends on obviously light-only background or border assumptions.
- The linked project memory stays consistent.
