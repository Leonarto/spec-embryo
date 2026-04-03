# AGENTS

This folder is the thin CLI command layer.

- Each command should orchestrate repository loading, engine calls, backend selection, and output formatting.
- Avoid burying core rules here; move reusable logic into `src/engine.ts` or `src/repository.ts`.
- If a command exposes a maintenance or health feature, prefer calling a reusable service in `src/services/`.
- Status-mutation commands should validate inputs, then delegate the actual document rewrite to repository helpers instead of editing frontmatter inline.
- Creation commands should also delegate to repository helpers so ID generation, link validation, and back-link updates stay deterministic and centralized.
- Current-state mutation commands should preserve the current-state body and validate referenced spec/task IDs through repository helpers.
- Agent-facing migration commands should return structured bundles from deterministic scans rather than embedding ad hoc prompt logic in the handler.
- Keep flags and user-facing behavior consistent with `src/cli.ts`.
- If a command starts needing multiple helpers or subflows, split it instead of growing one large file.
