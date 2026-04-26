# AGENTS

This folder contains the executable product code. Keep layering clear.

- `domain.ts`: shared typed contracts and parsing helpers
- `frontmatter.ts`, `storage.ts`, `repository.ts`: file-backed source-of-truth access
- `engine.ts`: deterministic derivation and linking
- `cli.ts`, `index.ts`, `commands/`: command routing and presentation
- `services/`: reusable deterministic product services
- `backends/`: execution adapters behind a shared interface

Rules:

- Prefer small pure functions.
- Keep CLI formatting out of the engine when possible.
- If logic is shared across commands and scripts, prefer `src/services/`.
- Put deterministic business logic in `engine.ts` or nearby helpers, not in command handlers.
- Extend `domain.ts` first when new document types or config shapes appear.
- Task lifecycle semantics live in the shared task document model; if completion, cancellation, or archival behavior changes, update task parsing and serialization together.
- Spec/task creation that allocates new IDs or rewrites linked docs must stay serialized through the shared repository lock in `storage.ts`; do not add parallel create paths that bypass it.
- Changed-item summaries are shared resume/status context, not command-local text; if git change reporting changes, keep the parsed raw status code, normalized hint, and human-readable summary shape consistent across `engine.ts`, backends, context-pack services, and status output.
- Add or update nested `AGENTS.md` files if a subarea becomes meaningfully more complex.
