+++
doc_kind = "task"
id = "TASK-081"
title = "Sort human changed-item lists with managed docs first"
summary = "Reorder status-style changed-item summaries so managed docs appear before generic files while preserving structured changed-item order."
status = "done"
spec_ids = ["SPEC-027"]
depends_on = []
blocked_by = []
priority = 2
owner_role = "builder"
created_at = "2026-04-26T03:00:00.840Z"
completed_at = "2026-04-26T03:16:02.614Z"
tags = ["git", "status", "ux"]
updated_at = "2026-04-26T03:16:02.614Z"
+++

# Scope

- Add a presentation-only ordering helper for changed-item summaries.
- Use it in human status-style surfaces while leaving structured changed-item arrays untouched.
- Add regression tests that prove managed items surface before `other` files in human output.

# Done Looks Like

- Human status-style changed-item summaries show managed docs before generic files.
- Structured changed-item arrays keep their original git-derived order.
- Tests cover both the human ordering and the preserved structured ordering.
- The linked project memory stays consistent.
