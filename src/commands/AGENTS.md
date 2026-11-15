# AGENTS

This folder is the thin CLI command layer.

- Each command should load state, pick services, and format output.
- Avoid burying core rules here; move reusable logic into `src/engine.ts`, `src/repository.ts`, or `src/services/`.
- Status, creation, and current-state commands should validate inputs, then delegate deterministic rewrites to repository helpers.
- `init` stays a thin guided entrypoint: reusable services own repo classification, adoption artifacts, and scaffold rules; the handler should only prompt when a human choice is required.
- `init` should render adoption artifacts from the repo state that exists after initialization, so doctor drift checks and repo-local guidance agree on the same contract.
- `doctor` stays read-only here; concise by default, long guidance behind verbose or JSON modes.
- `agent` should stay a thin read-only wrapper over reusable guidance services; `brief` and `snippet` must both reuse shared adoption guidance instead of forking wording in the handler.
- `memory` commands should validate typed filters, note-scope inputs, and inclusion/exclusion flags in the handler, then delegate retrieval, note mutation, ranking, and rendering to reusable services.
- `nexus`, `portfolio`, `profile`, `import`, `hooks`, `release`, and `tests` commands should stay thin over deterministic services; keep previews read-only unless a flag like `--apply` is explicit.
- Keep flags and user-facing behavior consistent with `src/cli.ts`.
- `resume` builds the shared interruption window and selected-source snapshot before invoking any backend. Unavailable `--since` windows remain readable but prevent explicit spawn before artifacts are written.
- If a command starts needing multiple helpers or subflows, split it instead of growing one large file.
