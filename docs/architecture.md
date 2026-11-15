# Architecture

## V1 shape

Spec Embryo is intentionally split into seven layers:

1. Storage and file layer: filesystem access, TOML frontmatter parsing, config loading, and durable writes.
2. Domain model: typed documents for specs, tasks, handoffs, current state, and backend config.
3. Deterministic engine: linking, validation, git inspection, blockers, ready work, critical path, and next-action derivation.
4. CLI command layer: thin commands for `init`, `doctor`, `agent brief`, `agent snippet`, `status`, `current show`, `current set`, `ui`, `resume`, `handoff`, `portfolio`, `profile`, `import legacy`, `hooks`, `release`, `tests diagnose`, `memory note`, `memory query`, `memory links`, `memory brief`, `memory pack`, `memory scopes`, `memory consolidate`, `memory eval`, `spec list`, `spec set-status`, `task list`, and `task set-status`.
5. Deterministic product services: source-folder scanning, AGENTS health, portfolio aggregation, profile manifests, legacy import planning, hook/release planning, test diagnostics, dashboard data shaping, memory indexing/querying/briefing/packing/consolidation, section-level evidence extraction, layout normalization, and other reusable logic above the repository layer.
6. Local visual server: a SvelteKit app that renders managed memory through shared deterministic services rather than a second parser.
7. Execution backends: deterministic text output, prompt-return output, and optional subprocess adapters.

This keeps the repo-native memory system stable even as future interfaces evolve.

## Source of truth

The repo is the source of truth. V1 uses:

- `.specpm/config.toml` for tool configuration, optional external integration settings, and backend settings
- `.specpm/config.toml` also holds the project-standard AGENTS context-budget policy
- `.specpm/config.toml` also records the adopted repo's last written `tool_version` so doctor can surface newer CLI guidance
- `.specpm/config.toml` also defines optional scoped memory namespaces for session and org-style note collections
- `.specpm/profile.json` optionally records the selected deterministic project profile
- `.specpm/hooks.json` optionally records enabled local hook guidance events
- `docs/spm/` or `spm/` as the managed memory home
- `<memory-home>/current.md` for explicit current state
- `<memory-home>/handoffs/*.md` for durable handoff checkpoints
- `<memory-home>/specs/*.md` for spec documents
- `<memory-home>/tasks/*.md` for task documents
- `<memory-home>/skills/` for managed agent metadata
- `.specpm/memory/session/` and `.specpm/memory/org/` as optional scoped `memory-note` homes when those namespaces are enabled

Each document is Markdown with TOML frontmatter so it stays readable to both humans and AI agents while remaining easy to parse deterministically.

When existing projects already have a legacy docs/specs folder, `init` now classifies that repo state up front, emits deterministic next-step guidance, writes a repo-local migration guide plus direct-agent-brief file, and `spec import-prompt` provides an agent-ready migration bundle so that formatting work can happen without guessing the target schema. `import legacy` adds a deterministic apply path for simple legacy planning docs by creating canonical specs and tasks from mapped headings and task markers. `doctor` keeps its default human-readable output concise for repeated agent use, while `--verbose` expands into the longer adoption guide, current memory-workflow guidance, a bounded external `AGENTS.md` snippet, and explicit discoverability for both `spm agent brief` and `spm agent snippet` when callers need narrower agent-facing surfaces. The broader adoption outputs now point at those same direct commands too, and the shared guidance model exposes source-material hints, tag guidance, partial-adoption checks, workflow-loop commands, doctor-mode commands, direct-agent command suggestions, Nexus coexistence guidance, Nexus setup flow, Nexus setup command suggestions, Nexus setup review checks, capability-refresh command suggestions, capability-refresh review checks, and scoped-memory workflow commands as structured data so JSON consumers and renderers stay aligned on one contract. `agent brief` exposes a shorter steady-state workflow surface for agents that only need to know how to use SpM in the current repo today, and `agent snippet` exposes just the bounded additive `AGENTS.md` guidance when callers want a narrower surface. All of those command surfaces reuse shared adoption wording instead of inventing separate instruction layers. `doctor` also validates that the generated repo-local adoption artifacts still match the current deterministic renderer, so stale migration guides and agent briefs can be refreshed before another agent relies on them. The same adoption artifacts can now also teach bounded coexistence with optional external code-graph tooling such as Nexus without making that tooling part of Spec Embryo's source of truth.

Portfolio and release-oriented services are intentionally sidecar layers. `portfolio` reads a user-local registry and then projects each registered repo's own managed state; it does not centralize per-repo specs or tasks. `hooks` and `release` expose deterministic plans and readiness data so users can reduce drift and prepare publishes while keeping approval-sensitive actions explicit.

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

### Memory note

Core fields:

- `id`
- `title`
- `summary`
- `tags`
- optional `created_at`
- optional `expires_at`
- optional `consolidated_at`
- optional `promoted_to`
- optional `archived_at`
- optional `archive_reason`
- scope, inferred from the configured session or org memory home
- write policy, inherited from the configured memory scope

Memory notes are lightweight scoped context documents. They let Spec Embryo distinguish fast local notes or broader shared guidance from canonical repo memory without turning those scopes into a second planning authority.
The first write path for them lives under `spm memory note`, so session capture, allowed org-note edits, and deterministic archive/list workflows can happen through CLI flows instead of raw file editing.

### Execution backend

Core fields:

- backend name
- enabled flag
- optional subprocess command
- optional subprocess args

Backends are adapters. The core tool remains useful without them.

### Optional Nexus integration

Core fields:

- enabled flag
- optional command
- optional args
- root AGENTS coexistence mode

Nexus is modeled as an optional external code-analysis complement. It is not a required dependency and it does not replace managed specs, tasks, current state, handoffs, or adoption workflows. `spm nexus setup` previews or applies the bounded repo-local setup in one pass, while `doctor` remains read-only and validates that the repo still keeps planning authority with `spm`.

### Memory scopes

Core fields:

- enabled flag
- directory for file-backed note scopes
- write policy

The first scoped-memory model is intentionally simple:

- `repo`: the canonical managed memory home for specs, tasks, current state, and handoffs
- `session`: optional `memory-note` files for fast-changing local notes
- `org`: optional `memory-note` files for broader shared guidance, defaulting to read-only intent

Retrieval and context packs can filter or label these scopes explicitly, but repo memory remains the default source of truth for project execution.
Session notes are intentionally a capture layer, not durable truth: `spm memory consolidate` reviews duplicates, contradictions, related repo docs, and stale markers before promoting a note into durable repo memory such as a handoff.

## Deterministic vs non-deterministic boundaries

Deterministic by default:

- parse Markdown and TOML frontmatter
- validate document shape
- link specs to tasks
- inspect git state
- inspect registered portfolio projects from a user-local registry
- derive changed managed docs from git state, including one normalized change hint for shared status-style summaries plus one compact raw status code for structured consumers
- compute blocker and ready-task sets
- derive next actions when rules are explicit
- compute a simple critical path from dependencies
- write handoff and current-state files
- parse and rewrite spec open-question and resolved-decision sections
- render adoption-oriented migration guide and direct agent brief artifacts from deterministic repo inspection
- render one short agent-workflow brief plus an optional bounded external `AGENTS.md` snippet from the same deterministic adoption guidance data used by doctor and init artifacts
- validate bounded coexistence with optional external code-graph tooling through config, command-availability, and AGENTS contract checks
- index managed docs into deterministic retrieval entries and expose query/link/brief traversal by typed filters, backlinks, local neighborhoods, section-level evidence slices, compact context bundles, explicit match reasons, and deterministic concept-friendly ranking
- render profile, hook, release, schema-contract, and test-diagnostic guidance from explicit local data

Non-deterministic only when genuinely needed:

- ambiguous interpretation of messy notes
- natural-language critique of specs
- subjective synthesis across unstructured input
- higher-level planning suggestions beyond explicit rules

That is why prompt-return mode exists: if an AI is already calling Spec Embryo, the tool should return high-signal structured context and a recommended brief instead of nesting another model call.

## Context management principles

Spec Embryo is meant to work alongside coding agents such as Codex and Claude, not to impersonate them.

- `spm` should own durable repo memory, deterministic retrieval, context packaging, memory policy, and reviewable file-backed state.
- The model should own live reasoning, short-lived synthesis, and conversational adaptation over that context.
- When choosing between building more in-tool "intelligence" and improving context selection, compaction, ordering, or evaluation, prefer the latter.
- New context features should justify themselves through reproducibility, token efficiency, or better repo-specific grounding rather than by duplicating behavior the model already performs natively.
- Retrieval and context-pack flows should prefer smaller stable evidence sections before escalating to whole-document expansion, and they should expose deterministic typed expansion trails when multiple ref kinds are present.
- Eval flows should stay deterministic, runnable in CI, and readable enough that future context changes extend the same measurement surface instead of inventing private one-off checks.

This boundary keeps Spec Embryo useful across providers while avoiding a fragile second assistant hidden inside the tool.

## Local visual server

The first local visual server lives under `web/` and is launched through `spm ui`.

- SvelteKit handles the presentation layer and local server lifecycle.
- The dashboard loads its data from shared deterministic services in `src/services/`.
- The UI is mostly read-only in v1, with a narrow deterministic mutation path for answering spec open questions.
- The first mutation flow lives on spec detail pages: users can answer open questions in batch, write those answers back into the spec deterministically, and receive continuation guidance without turning the web app into a second source of truth.
- The web layer should remain a view over repo memory, not a replacement source of truth.

## AGENTS budget policy

AGENTS sizing is now project-configured instead of being only hardcoded in the checker.

- `.specpm/config.toml` defines the standard `context_window_tokens` for the project.
- Root and chain AGENTS budgets are derived from context-ratio settings.
- Folder-local AGENTS budgets are scaled from the root budget by deterministic multipliers in the AGENTS service.
- Absolute hard caps still exist so a large configured context window does not automatically justify bloated always-on instructions.

This keeps AGENTS policy stable for everyone in the repo without forcing user-specific edits whenever an individual changes models.

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
- it renders a readable prompt text artifact, a JSON bundle artifact, and separate stable-prefix / variable-tail prompt artifacts
- it exposes stable token replacements such as `{prompt_text_file}`, `{prompt_bundle_file}`, `{prompt_stable_prefix_file}`, and `{prompt_variable_tail_file}`
- it exports stable env vars such as `SPM_PROMPT_TEXT_FILE`, `SPM_PROMPT_BUNDLE_FILE`, `SPM_PROMPT_STABLE_PREFIX_FILE`, and `SPM_PROMPT_VARIABLE_TAIL_FILE`

The stable prefix contains only invariant instructions and output-format rules. All selected project state, including focus, specs, context packs, tasks, and interruption windows, belongs in the variable tail. Text assembly renders each block once and uses `services/resume-render.ts` to enforce a complete-prompt UTF-8 byte budget (32768 by default; configurable from 4096 to 1048576). Oversized context becomes a compact identity/focus/blocker summary plus deterministic references, omission counts, and a full-data expansion command. Legacy PromptBundle data remains complete in JSON. Prefix separation is a deterministic contract, not a promise of provider cache behavior.

`resume --json` reuses the shared `schema_version` and preserves `resume` plus optional `interruption_window`. Its additive portable fields are `context_pack`, `warnings`, and `context_snapshot` (`head`, `branch`, `dirty`, `fingerprint`, `sources`). Git references are full SHA/null and branch/null; `lastCommit` remains the legacy human-readable commit description. Sources contain document IDs, paths relative to the project, and `content_hash` values or null when provenance is missing.

Repository loading reads a document Buffer once, hashes those exact bytes through identity-scoped `services/document-provenance.ts`, then decodes and parses them. `services/resume-snapshot.ts` collects provenance from canonical selected documents before projection, combines it with selected state and Git observations, and hashes recursively key-sorted JSON with deterministic array order. Execution timestamps, run IDs, temporary paths, and rendering metadata are excluded. A later filesystem mutation cannot change the provenance of an already loaded object; clones do not inherit it. The snapshot is not an atomic filesystem observation and does not promise invalidation for changes outside selected context.

`services/resume-window.ts` accepts a single commit revision, rejects options/ranges, verifies and resolves it to a SHA, and compares committed history through HEAD. The same optional window reaches every backend before execution, remains in the outer JSON envelope, and appears in prompt bundle/text/tail artifacts; it never enters the stable prefix. Local working-tree changes stay in `changed_items`. Invalid or unavailable revisions remain readable with explicit warnings, but block requested spawn before artifact creation. An unborn HEAD is unavailable; resolving HEAD itself yields a valid empty window. Read/preview flows remain useful without Git, credentials, or a harness CLI and never register hooks or start another agent implicitly.

## Future growth path

The v1 structure is meant to grow cleanly into:

- richer graph and scheduler logic
- repo-local skills registry
- handoff timelines and audits
- a lightweight local server that visualizes the same source files
- analytical views that group work by spec set and lifecycle window without leaving the file-backed model
- interactive timeline tracing that stays URL-driven and deterministic so a selected dependency neighborhood can be shared in a handoff or review link
- a later optional backend or database without invalidating the file-backed model
- optional deeper Nexus-style integrations for review prep or resume enrichment once the external coexistence contract has proven stable
