+++
doc_kind = "task"
id = "TASK-065"
title = "Implement Nexus setup dry-run and apply flow"
summary = "Add a first-class spm nexus setup command that plans and applies bounded Nexus config, AGENTS guidance, adoption artifact refreshes, and verification prompts for external repos."
status = "done"
spec_ids = ["SPEC-018"]
depends_on = []
blocked_by = []
priority = 1
created_at = "2026-04-11T20:05:22.163Z"
completed_at = "2026-04-11T20:13:57.829Z"
tags = ["nexus", "cli", "adoption", "agents"]
updated_at = "2026-04-11T20:13:57.829Z"
+++

# Scope

- Add a reusable deterministic Nexus setup service under `src/services/`.
- Add a thin `spm nexus setup` CLI command with `--apply`, `--command`, `--root-agents-mode`, and `--json`.
- Update help text and command routing.
- Update docs/adoption guidance as needed so the one-step setup command is the recommended activation path.
- Add regression tests for dry-run, apply, and idempotent re-apply behavior.
- Keep `doctor` read-only and `init` adoption-focused.

# Done Looks Like

- `spm nexus setup` produces a read-only plan.
- `spm nexus setup --apply` writes config, root AGENTS guidance, `.gitignore` rules, and adoption artifacts without duplicating content.
- `spm nexus setup --json` returns structured plan/apply data.
- Tests and AGENTS checks pass.
- The linked spec and current state describe the new workflow accurately.
