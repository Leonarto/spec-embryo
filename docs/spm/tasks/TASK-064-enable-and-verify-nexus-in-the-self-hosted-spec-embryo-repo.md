+++
doc_kind = "task"
id = "TASK-064"
title = "Enable and verify Nexus in the self-hosted Spec Embryo repo"
summary = "Turn on the optional Nexus contract in this repo, preserve local Nexus artifacts safely, and verify doctor plus GitNexus status agree."
status = "done"
spec_ids = ["SPEC-017"]
depends_on = []
blocked_by = []
priority = 1
created_at = "2026-04-11T03:16:28.635Z"
completed_at = "2026-04-11T03:17:58.862Z"
tags = ["nexus", "self-hosting", "agents"]
updated_at = "2026-04-11T03:29:46.000Z"
+++

# Scope

- Enable the optional `[nexus]` contract in this repo's `.specpm/config.toml`.
- Add the bounded `## Nexus Coexistence` contract to root `AGENTS.md` without exceeding AGENTS budgets.
- Keep the local `.gitnexus/` index and `.claude/` Nexus skill artifacts out of source control via `.gitignore`.
- Re-index the repo with `gitnexus analyze --skip-agents-md --force` so AGENTS stays under `spm` control.
- Verify both `spm doctor` and GitNexus status/list output.

# Done Looks Like

- `spm doctor` reports no Nexus warnings or blockers.
- `bun run check:agents` passes.
- GitNexus lists `spec-pm` and reports the repo indexed.
- The local `.gitnexus/` index and `.claude/` Nexus skill artifacts remain ignored.

# Review Fixes

- Invalid `nexus.root_agents_mode` values are rejected as invalid config instead of silently falling back to `reference-only`.
- `root_agents_mode = "scoped"` validates bounded Nexus coexistence in nested `AGENTS.md` files instead of requiring the root file to carry the Nexus section.
- AGENTS discovery ignores local `.gitnexus/` and `.claude/` artifact directories.
