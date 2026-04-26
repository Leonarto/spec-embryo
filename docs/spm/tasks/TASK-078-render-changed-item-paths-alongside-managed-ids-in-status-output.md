+++
doc_kind = "task"
id = "TASK-078"
title = "Render changed-item paths alongside managed ids in status output"
summary = "Update human-readable status reporting so changed managed docs show both their spec/task/current identity and their concrete relative path."
status = "done"
spec_ids = ["SPEC-024"]
depends_on = []
blocked_by = []
priority = 2
owner_role = "builder"
created_at = "2026-04-26T02:03:33.049Z"
completed_at = "2026-04-26T02:24:25.702Z"
tags = ["git", "status", "ux"]
updated_at = "2026-04-26T02:24:25.702Z"
+++

# Scope

- Add a shared human-readable changed-item formatter that keeps managed identity and relative path together.
- Use that formatter in `spm status` and other text surfaces that summarize changed items from resume context.
- Add regression tests for the rendered strings.

# Done Looks Like

- Human status output shows managed changed docs with both identity and relative path.
- Unmanaged changed items still render as plain paths.
- Related text surfaces stay consistent instead of using competing summary shapes.
- Regression tests verify the new human-readable formatting.
- The linked project memory stays consistent.
