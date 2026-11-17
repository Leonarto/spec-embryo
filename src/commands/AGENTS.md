# AGENTS

This folder is the thin CLI command layer.

- Commands load state, select services, and format output; reusable rules belong in engine, repository, or services.
- Status, creation, and current-state commands should validate inputs, then delegate deterministic rewrites to repository helpers.
- Init delegates classification/scaffolding and renders guidance from the initialized state; prompt only for human choices.
- Doctor/brief probe harnesses only with explicit `--harness`; snippets never probe. Keep diagnosis optional and separate from project health.
- Agent brief/snippet share adoption services. `hook-context` returns native read-only envelopes through a bounded private worker; never route it through doctor or launch an agent.
- `memory` commands should validate typed filters, note-scope inputs, and inclusion/exclusion flags in the handler, then delegate retrieval, note mutation, ranking, and rendering to reusable services.
- Hooks keep Git events separate from `--harness` presets; native install/remove require `--apply`. Other integration commands stay thin over services and explicit writes.
- Keep flags and user-facing behavior consistent with `src/cli.ts`.
- `resume` shares window/snapshot before execution. Its result dispatcher owns versioned JSON failures and normalized exit codes; subprocess services own cancellation/artifacts. Unavailable windows block spawn before writes.
- Native resume evidence stays in harness services; preserve invocation/native results on later evidence errors. `handoff --from-run` previews by default and applies only after an independent byte guard under the repository lock. Legacy handoff stays unchanged.

- UI verifies artifacts before Node spawn; explicit DEV invokes Vite. Own readiness and bounded shutdown.
