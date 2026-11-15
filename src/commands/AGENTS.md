# AGENTS

This folder is the thin CLI command layer.

- Commands load state, select services, and format output; reusable rules belong in engine, repository, or services.
- Status, creation, and current-state commands should validate inputs, then delegate deterministic rewrites to repository helpers.
- `init` stays a thin guided entrypoint: reusable services own repo classification, adoption artifacts, and scaffold rules; the handler should only prompt when a human choice is required.
- `init` should render adoption artifacts from the repo state that exists after initialization, so doctor drift checks and repo-local guidance agree on the same contract.
- Doctor/brief probe harnesses only with explicit `--harness`; snippets never probe. Keep diagnosis optional and separate from project health.
- Agent brief/snippet share adoption services. `hook-context` returns native read-only envelopes through a bounded private worker; never route it through doctor or launch an agent.
- `memory` commands should validate typed filters, note-scope inputs, and inclusion/exclusion flags in the handler, then delegate retrieval, note mutation, ranking, and rendering to reusable services.
- Hooks keep Git events separate from `--harness` presets; native install/remove require `--apply`. Other integration commands stay thin over services and explicit writes.
- Keep flags and user-facing behavior consistent with `src/cli.ts`.
- `resume` shares window/snapshot before execution. Its result dispatcher owns versioned JSON failures and normalized exit codes; subprocess services own cancellation/artifacts. Unavailable windows block spawn before writes.
