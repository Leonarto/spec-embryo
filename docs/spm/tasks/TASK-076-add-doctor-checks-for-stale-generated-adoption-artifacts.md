+++
doc_kind = "task"
id = "TASK-076"
title = "Add doctor checks for stale generated adoption artifacts"
summary = "Warn when the repo-local migration guide or direct agent brief diverges from the current deterministic renderer so agents know to refresh them before relying on stale guidance."
status = "done"
spec_ids = ["SPEC-022"]
depends_on = []
blocked_by = []
priority = 1
owner_role = "builder"
created_at = "2026-04-26T01:12:47.494Z"
completed_at = "2026-04-26T01:40:58.613Z"
tags = ["adoption", "doctor", "drift"]
updated_at = "2026-04-26T01:40:58.613Z"
+++

# Scope

- Make `doctor` render the expected migration guide and direct agent brief, compare them with the repo-local generated files, and emit warnings when they are missing or stale.
- Reuse the existing adoption artifact path helpers and deterministic renderers so drift detection stays aligned with `spm init`.
- Add regression tests for both missing-file and stale-content scenarios.

# Done Looks Like

- `doctor` warns when `migration-guide.md` or `direct-agent-brief.md` is missing.
- `doctor` warns when either generated adoption artifact exists but no longer matches the current CLI renderer.
- The warning hint tells the user or agent to run `spm init` to refresh the generated guidance.
- Tests cover the new doctor findings.
- The linked project memory stays consistent.
