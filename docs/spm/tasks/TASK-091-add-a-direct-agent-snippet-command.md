+++
doc_kind = "task"
id = "TASK-091"
title = "Add a direct agent snippet command"
summary = "Expose the bounded external AGENTS snippet as a first-class command with human and JSON output."
status = "review"
spec_ids = ["SPEC-035"]
depends_on = []
blocked_by = []
priority = 2
created_at = "2026-04-27T01:42:23.424Z"
tags = []
updated_at = "2026-04-27T01:45:18.863Z"
+++

# Scope

- Extend `spm agent` with a `snippet` subcommand that returns only the bounded external `AGENTS.md` guidance.
- Reuse the shared adoption-guidance snippet already computed by the service layer instead of inventing a command-local snippet format.
- Add human-readable and JSON output coverage for normal, missing-current-state, and unreadable-current-state flows.
- Refresh the command help and public docs so the direct snippet surface is discoverable.

# Done Looks Like

- `spm agent snippet` prints only the bounded external snippet and its short note.
- `spm agent snippet --json` returns a stable snippet payload suitable for wrapper tooling.
- The command stays thin and delegates rendering logic to reusable services.
- Tests cover the direct command and unsupported-subcommand behavior.
- The linked project memory stays consistent.
