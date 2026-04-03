# Architecture

## V1 shape

Spec Embryo is intentionally split into seven layers:

1. Storage and file layer: filesystem access, TOML frontmatter parsing, config loading, and durable writes.
2. Domain model: typed documents for specs, tasks, handoffs, current state, and backend config.
3. Deterministic engine: linking, validation, git inspection, blockers, ready work, critical path, and next-action derivation.
4. CLI command layer: thin commands for `init`, `status`, `current show`, `current set`, `ui`, `resume`, `handoff`, `spec list`, `spec set-status`, `task list`, and `task set-status`.
5. Deterministic product services: source-folder scanning, AGENTS health, dashboard data shaping, layout normalization, and other reusable logic above the repository layer.
6. Local visual server: a SvelteKit app that renders managed memory through shared deterministic services rather than a second parser.
7. Execution backends: deterministic text output, prompt-return output, and optional subprocess adapters.

This keeps the repo-native memory system stable even as future interfaces evolve.

## Source of truth

The repo is the source of truth. V1 uses:

- `.specpm/config.toml` for tool configuration and backend settings
- `docs/spm/` or `spm/` as the managed memory home
- `<memory-home>/current.md` for explicit current state
- `<memory-home>/handoffs/*.md` for durable handoff checkpoints
- `<memory-home>/specs/*.md` for spec documents
- `<memory-home>/tasks/*.md` for task documents
- `<memory-home>/skills/` for managed agent metadata

Each document is Markdown with TOML frontmatter so it stays readable to both humans and AI agents while remaining easy to parse deterministically.

When existing projects already have a legacy docs/specs folder, `spec import-prompt` provides a deterministic scan plus an agent-ready migration bundle so that formatting work can happen without guessing the target schema.

## Domain model

### Spec

Core fields:

- `id`
- `title`
- `status`
- `summary`
- `task_ids`
- `tags`
- `owner`

Specs are the stable planning anchor. Tasks link back to specs instead of floating independently.

### Task

Core fields:

- `id`
- `title`
- `status`
- `summary`
- `spec_ids`
- `depends_on`
- `blocked_by`
- `priority`
- `owner_role`
- `created_at`
- `completed_at`
- `cancelled_at`
- `archived_at`
- `archive_reason`

Tasks are execution units. Dependency links drive deterministic readiness and critical path logic.
Lifecycle timestamps are explicit so completion, cancellation, archival, and later time-window analysis do not depend on generic edit time.
`review` is a real gate in the lifecycle: `done` means any review findings were already addressed, not merely that a review happened once.

### Handoff

Core fields:

- `id`
- `title`
- `summary`
- `handoff_kind`
- `created_at`
- `active_task_ids`
- `related_spec_ids`
- `author`

Handoffs are first-class checkpoints for interrupted work rather than disposable chat summaries.

### Current state

Core fields:

- `focus`
- `summary`
- `active_spec_ids`
- `active_task_ids`
- `blocked_task_ids`
- `next_action_hints`
- `last_handoff_id`

This file is the fastest way to answer “where was I?” after a pause.

### Execution backend

Core fields:

- backend name
- enabled flag
- optional subprocess command
- optional subprocess args

Backends are adapters. The core tool remains useful without them.

## Deterministic vs non-deterministic boundaries

Deterministic by default:

- parse Markdown and TOML frontmatter
- validate document shape
- link specs to tasks
- inspect git state
- derive changed managed docs from git state
- compute blocker and ready-task sets
- derive next actions when rules are explicit
- compute a simple critical path from dependencies
- write handoff and current-state files
- parse and rewrite spec open-question and resolved-decision sections

Non-deterministic only when genuinely needed:

- ambiguous interpretation of messy notes
- natural-language critique of specs
- subjective synthesis across unstructured input
- higher-level planning suggestions beyond explicit rules

That is why prompt-return mode exists: if an AI is already calling Spec Embryo, the tool should return high-signal structured context and a recommended prompt instead of nesting another model call.

## Local visual server

The first local visual server lives under `web/` and is launched through `spm ui`.

- SvelteKit handles the presentation layer and local server lifecycle.
- The dashboard loads its data from shared deterministic services in `src/services/`.
- The UI is mostly read-only in v1, with a narrow deterministic mutation path for answering spec open questions.
- The first mutation flow lives on spec detail pages: users can answer open questions in batch, write those answers back into the spec deterministically, and receive continuation guidance without turning the web app into a second source of truth.
- The web layer should remain a view over repo memory, not a replacement source of truth.

## Execution modes

### Deterministic mode

Default local code path for status, resume, linking, and handoff generation.

### Prompt-return mode

Returns:

- structured context
- recommended prompt
- expected output format
- optional subtask prompts

This is the preferred mode when another agent is already in control.

### Subprocess agent mode

Backends like `CodexBackend` and `ClaudeBackend` sit behind a shared subprocess adapter. They are optional and configuration-driven. The product is not centered around them.

The shared adapter owns the prompt contract:

- it builds the same prompt bundle used by prompt-return mode
- it renders a readable prompt text artifact and a JSON bundle artifact
- it exposes stable token replacements such as `{prompt_text_file}` and `{prompt_bundle_file}`
- it exports stable env vars such as `SPM_PROMPT_TEXT_FILE` and `SPM_PROMPT_BUNDLE_FILE`

That keeps subprocess orchestration deterministic and prevents backend-specific prompt drift.

## Future growth path

The v1 structure is meant to grow cleanly into:

- richer graph and scheduler logic
- repo-local skills registry
- handoff timelines and audits
- a lightweight local server that visualizes the same source files
- analytical views that group work by spec set and lifecycle window without leaving the file-backed model
- a later optional backend or database without invalidating the file-backed model
