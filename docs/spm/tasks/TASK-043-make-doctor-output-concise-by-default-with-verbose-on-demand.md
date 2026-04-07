+++
doc_kind = "task"
id = "TASK-043"
title = "Make doctor output concise by default with verbose on demand"
summary = "Keep doctor cheap for recurrent agent use by making the default output short while preserving the current long guidance under an explicit verbose mode."
status = "done"
spec_ids = ["SPEC-010"]
depends_on = []
blocked_by = []
priority = 1
owner_role = "builder"
created_at = "2026-04-07T22:36:41.233Z"
completed_at = "2026-04-07T22:38:42.796Z"
tags = ["adoption"]
updated_at = "2026-04-07T22:38:42.796Z"
+++

# Scope

- Make `spm doctor` default to a short human-readable summary centered on status, findings, versions, config, and counts.
- Preserve the current long adoption guidance, recommended commands, and direct-agent brief behind an explicit `--verbose` flag.
- Keep `spm doctor --json` stable so agents can still read structured findings and guidance without scraping human text.
- Update docs and tests so future agents understand the cheap-by-default doctor workflow.

# Done Looks Like

- `spm doctor` no longer emits the full adoption guide by default.
- `spm doctor --verbose` preserves the richer orientation and direct-brief output.
- `spm doctor --json` still returns the same structured report shape.
- Tests prove the concise/verbose split and the linked project memory stays consistent.
