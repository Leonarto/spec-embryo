# AGENTS

This folder is the thin CLI command layer.

- Each command should orchestrate repository loading, engine calls, backend selection, and output formatting.
- Avoid burying core rules here; move reusable logic into `src/engine.ts` or `src/repository.ts`.
- If a command exposes a maintenance or health feature, prefer calling a reusable service in `src/services/`.
- Status, creation, and current-state commands should validate inputs, then delegate deterministic rewrites to repository helpers.
- Agent-facing migration commands should return structured bundles from deterministic scans rather than embedding ad hoc prompt logic in the handler.
- `init` stays a thin guided entrypoint: reusable services own repo classification, adoption artifacts, and scaffold rules; the handler should only prompt when a human choice is required.
- `doctor` stays read-only in the command layer. Its default human output should be concise, and any copy-pasteable brief or long guidance should come from reusable services behind explicit verbose or JSON modes.
- `memory` commands should validate typed filters and inclusion/exclusion flags in the handler, then delegate retrieval, ranking, and rendering to reusable services.
- `nexus` commands should stay thin over deterministic setup services; keep the default path read-only and require explicit `--apply` for file writes.
- Keep flags and user-facing behavior consistent with `src/cli.ts`.
- If a command starts needing multiple helpers or subflows, split it instead of growing one large file.
