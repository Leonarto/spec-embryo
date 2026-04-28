# spec-embryo

`spec-embryo` is a local-first, spec-first, CLI-first project memory and orchestration tool for AI-assisted software work. It attaches to a repo's documentation surface when that is a good fit and otherwise creates its own `spm/` home. Durable memory stays readable in Markdown with TOML frontmatter while deterministic TypeScript derives status, resume context, and next actions from those files.

## Philosophy

- Local-first: the repo is the source of truth.
- Deterministic-first: parsing, linking, validation, git inspection, and next-action derivation stay in local code.
- Spec-first: specs anchor work; tasks attach to specs.
- Review-gated execution: implementation work should pass through review before it is marked done, and review findings must be fixed before a task leaves the review gate.
- Resume-friendly: current state and handoffs make interrupted work easy to continue.
- Agent-native without agent-dependence: prompt-return is first-class, subprocess backends are adapters, and the tool is useful with zero agent configured.
- Assistant-sidecar, not assistant-clone: `spm` should own durable repo memory, deterministic context packaging, and project workflow while letting Codex, Claude, or other agents own live reasoning and conversational adaptation.

## V1 workflow

```bash
bun run spec-embryo init
bun run spm init
bun run spm agent brief
bun run spm agent snippet
bun run spm status
bun run spm current show
bun run spm current set --focus "Implement current-state maintenance flows" --active-task-ids TASK-006
bun run spm ui
bun run spm resume
bun run spm resume --backend prompt
bun run spm spec list
bun run spm spec create --title "Local visualization server" --summary "Define the UI slice for managed project memory" --status active --tags ui,server
bun run spm spec set-status SPEC-003 active
bun run spm spec import-prompt --source docs/specs --instructions "Preserve product intent and split execution into tasks"
bun run spm task list
bun run spm task create --title "Add spec create command" --summary "Let the CLI create new spec docs deterministically" --spec-ids SPEC-002 --depends-on TASK-004 --priority 1
bun run spm task set-status TASK-005 in_progress
bun run spm handoff --title "Checkpoint before refactor"
bun run spm reshape --dry-run
```

## Install

```bash
bun add -g @leonarto/spec-embryo
```

Or install directly from GitHub:

```bash
bun add -g github:Leonarto/spec-embryo
```

You can also run the entrypoint directly:

```bash
bun run src/index.ts status
```

`spm` is the primary short command. `spec-embryo` is the long-form name.

## Optional Nexus

Spec Embryo can coexist with an external Nexus installation for code-impact analysis, but Nexus is optional and is not bundled with `spm`.

Safe setup flow:

1. Install Nexus separately by following the upstream Nexus instructions for your environment.
2. Run `spm nexus setup` to preview the repo-local config, AGENTS, ignore-rule, and adoption-artifact changes.
3. If the human approves, run `spm nexus setup --apply`.
4. Re-run `spm doctor`.
5. Run the recommended GitNexus indexing command if the external tool is installed.

Use `spm` for project memory and deterministic workflow. Use Nexus only for code impact, related-code, and blast-radius analysis.

## Source-of-truth layout

```text
.specpm/
  config.toml
  templates/
docs/
  spm/
    current.md
    handoffs/
    specs/
    tasks/
    skills/
  architecture.md
  spec-format.md
src/
tests/
web/
```

## Command summary

- `init`: act as the primary adoption entrypoint by classifying repo state, discovering a docs/specs surface when appropriate, creating or completing the managed memory home, and writing a repo-local migration guide plus direct-agent-brief file.
- `init --json`: return the same adoption classification plus a structured next-step guide and direct agent brief that the user can hand to an already-running agent.
- `reshape`: bring project memory back to the standard managed layout if it drifted.
- `doctor`: inspect repo-memory health, adoption state, generated-adoption-artifact drift, broken links, recorded tool-version lag, and bounded Nexus coexistence when Nexus is enabled, with a concise default summary that keeps recurring agent reads cheap while pointing at `spm agent brief` and `spm agent snippet` when narrower agent-facing surfaces are enough.
- `doctor --verbose`: include the full adoption guide, current memory-workflow guidance, a bounded external `AGENTS.md` snippet, explicit `spm agent snippet` discoverability, version-aware capability refresh guidance, next-command sequence, and copy-pasteable direct agent brief.
- `doctor --json`: return structured findings plus deterministic migration, structured source-material inspection hints, structured tag guidance, structured partial-adoption checks, workflow-loop command guidance, structured doctor-mode guidance, memory-workflow guidance, structured memory-workflow command guidance, direct-agent-command guidance, typed direct-agent command suggestions, bounded external `AGENTS.md` snippet guidance, structured Nexus coexistence guidance, structured Nexus setup flow, typed Nexus setup command suggestions, capability-refresh metadata, typed capability-refresh command suggestions, structured capability-refresh review checks, version/update metadata, and the direct agent brief for agent continuation.
- `agent brief`: return one short deterministic "how to use SpM here today" workflow for agents, with structured source-material inspection hints, structured tag guidance, the default resume loop, structured partial-adoption checks, structured workflow-loop command guidance, structured doctor-mode guidance, scoped-memory guidance, structured memory-workflow command guidance, structured direct-agent-command guidance, typed direct-agent command suggestions, bounded external `AGENTS.md` snippet guidance, structured Nexus coexistence guidance, structured Nexus setup flow, typed Nexus setup command suggestions, version-aware capability refresh, typed capability-refresh command suggestions, structured capability-refresh review checks, and matching discoverability from the broader adoption outputs in either human or JSON form.
- `agent snippet`: return only the bounded external `AGENTS.md` snippet so humans or wrapper agents can retrieve the additive SpM guidance directly in human or JSON form.
- `agents check`: validate `AGENTS.md` files against the project-level context-ratio budget policy in `.specpm/config.toml`.
- `nexus setup`: preview or apply the bounded optional Nexus setup across config, AGENTS guidance, local artifact ignore rules, and adoption artifacts.
- `memory note`: create, update, archive, restore, and list scoped `memory-note` documents through deterministic CLI flows instead of editing `.specpm/memory/...` files by hand.
- `memory query`: retrieve managed docs by text, kind, scope, status, tags, IDs, backlinks, and one-hop neighborhoods with compact default output, stable JSON, deterministic match reasons, concept-friendly ranking, and body-text retrieval over managed Markdown.
- `memory links`: inspect outgoing links, backlinks, and deterministic one-hop or two-hop neighborhoods for any managed doc.
- `memory brief`: compress managed memory into compact implementation, review, or migration context for a doc, spec, task, or topic query, including why a center or text match was selected, smaller section-level evidence slices, and explicit inclusion/exclusion of neighbors, current state, handoffs, and memory scopes.
- `memory pack`: build a first-class compact context pack for implementation, review, or migration work so another human or agent can start from must-read context, inspect top evidence sections early, and expand into supporting or offloaded detail only when needed.
- `memory scopes`: inspect the configured session, repo, and org-style memory namespaces plus their write-policy expectations.
- `memory consolidate`: dry-run or apply promotion of a session `memory-note` into durable repo memory, with explicit duplicate, contradiction, related-doc, and staleness signals before any write happens.
- `memory eval`: run deterministic retrieval, pack, consolidation, and source-of-truth injection scenario suites so context work is measured with repeatable pass/fail signals instead of intuition.
- `status`: inspect current repo state, linked work, blockers, git changes, changed managed docs, and critical path.
- `current show` / `current set`: inspect and deterministically update the explicit current-state checkpoint.
- `ui`: start the local SvelteKit dashboard that visualizes the managed project memory.
- `resume`: build deterministic resume context for a human, or a prompt bundle for an already-running agent.
- `handoff`: write a durable handoff Markdown checkpoint from the current state.
- `spec list`: list specs and their linked tasks.
- `spec create`: create a new spec doc with a deterministic ID and optional linked tasks.
- `spec set-status`: update a spec status deterministically in-place.
- `spec import-prompt`: scan an existing docs/specs folder and emit an agent-ready migration bundle for Spec Embryo format.
- `task list`: list tasks with dependency and status details.
- `task create`: create a new task doc with a deterministic ID and update linked specs automatically.
- `task set-status`: update a task status deterministically in-place, including the explicit `review` stage before `done`.
- `task archive` / `task archive-done` / `task archive-cancelled`: archive closed tasks without deleting their durable docs.
- `task restore`: clear archival metadata so a task is visible in active-flow views again.

Task docs now support explicit lifecycle metadata such as `created_at`, `completed_at`, and `cancelled_at`, so archival and time-based analysis can build on meaningful state transitions instead of `updated_at`.

## Execution modes

- `deterministic`: pure local code, the default.
- `prompt`: return structured context, a recommended prompt, expected output, and subtask prompts instead of nesting another AI.
- `codex` / `claude`: subprocess adapters that can be enabled later in `.specpm/config.toml`.

When a subprocess backend is enabled, Spec Embryo now gives it a stable launch contract:

- prompt text token: `{prompt}` or `{prompt_text}`
- prompt bundle JSON token: `{prompt_bundle}`
- stable prompt prefix token: `{prompt_stable_prefix}`
- variable prompt tail token: `{prompt_variable_tail}`
- prompt text file token: `{prompt_text_file}` or legacy `{prompt_file}`
- prompt bundle file token: `{prompt_bundle_file}` or `{bundle_file}`
- stable prompt prefix file token: `{prompt_stable_prefix_file}`
- variable prompt tail file token: `{prompt_variable_tail_file}`
- env vars: `SPM_BACKEND_NAME`, `SPM_PROJECT_ROOT`, `SPM_PROMPT_FILE`, `SPM_PROMPT_TEXT_FILE`, `SPM_PROMPT_BUNDLE_FILE`, `SPM_PROMPT_STABLE_PREFIX_FILE`, `SPM_PROMPT_VARIABLE_TAIL_FILE`

That keeps prompt-return and subprocess execution aligned instead of making each backend invent its own prompt packaging, while also separating stable prompt prefixes from more volatile execution tails for backends that can benefit from cache-friendly assembly.

## What is implemented now

- Bun + TypeScript CLI with small, typed modules
- Markdown + TOML frontmatter document model
- Deterministic parsing and validation
- Git-aware status and resume summaries, including deterministic changed-item derivation with shared identity/path human summaries plus compact raw status codes for structured consumers
- Task dependency graph and simple critical path derivation
- Local SvelteKit workspace launched through `spm ui`
- Workspace views for overview dashboard, task Kanban, Specs, and a compact grouped Gantt timeline
- Task Kanban spec filters that narrow the active board without pulling archived work back into the operational flow
- Multi-spec and lifecycle-window filters for analytical Specs and Gantt slices, including archived work when the goal is slice analysis instead of active-board hygiene
- Dedicated spec and task detail routes with deterministic not-found states, linked context, and inline source narrative rendering
- Spec detail pages that can parse `Open Questions`, answer them in batch from the UI, write those answers back into Markdown deterministically, and surface continuation guidance plus an agent evaluation prompt bundle
- A denser split-pane timeline with spec grouping and active-vs-completed display modes for broader planning scans
- Interactive timeline tracing with URL-driven task selection, distinct upstream/downstream highlighting, and related-spec emphasis for cross-spec diagnosis
- Prompt-return backend for agent-safe orchestration
- Prompt bundle assembly that separates stable prefixes from variable tails while preserving one shared deterministic prompt contract across prompt-return and subprocess adapters
- A product direction that treats context management as packaging, scoping, consolidation, and evaluation work rather than trying to recreate model-native reasoning inside the tool
- Handoff file generation
- Deterministic spec/task creation with automatic back-linking
- Initial spec/task/current-state templates and seed files
- Adoption-aware `init` output that classifies fresh, legacy-docs, partial, and already-adopted repos before seeding files
- Repo-local migration guide and direct-agent-brief artifacts for human-reviewed external adoption
- `spm agent brief` as a first-class repo-local usage brief so upgraded or newly-adopted agents can learn the current SpM workflow from one short deterministic surface, including an optional bounded `AGENTS.md` snippet for host repos that want a minimal SpM reminder without surrendering their own instruction layer
- `spm agent snippet` as the direct retrieval surface for that bounded external `AGENTS.md` snippet when callers want just the additive guidance without the rest of the adoption brief
- Deterministic memory indexing, typed link graphs, and the first `spm memory query` retrieval command over managed memory
- `spm memory links` for grouped backlinks, outgoing relations, and deterministic local neighborhoods over managed memory
- `spm memory brief` for compact working context built from current state, retrieval matches, explicit match reasons, section-level evidence slices, local neighborhoods, and recent handoffs
- `spm memory pack` plus prompt-return context packs so human and agent flows can share one deterministic compact-context shape with must-read, supporting, section-level evidence, offloaded detail, and typed next-inspect expansion trails
- Scoped memory namespaces where core managed docs remain `repo` scope and optional `memory-note` files can live in `session` or `org` scopes with explicit write policies and scope-aware retrieval
- `spm memory note create`, `update`, `archive`, `restore`, and `list` so session-first capture and controlled note lifecycle management no longer depend on raw file edits
- `spm memory consolidate` so quick session captures can be reviewed, promoted into durable handoffs, and retired with deterministic duplicate, contradiction, and stale-note checks
- `spm memory eval` as a runnable eval harness for retrieval, context-pack, consolidation, and injection quality across both the live repo and synthetic fixture scenarios
- Optional external Nexus guardrails through config, doctor checks, adoption guidance, and `spm nexus setup` so code-graph analysis can complement `spm` without replacing it

## Architecture

Architecture details live in [docs/architecture.md](docs/architecture.md).

Spec format details live in [docs/spec-format.md](docs/spec-format.md).

## Agent guidance

- Root repo guidance lives in [AGENTS.md](AGENTS.md).
- Growing areas also have local `AGENTS.md` files with folder-specific context.
- Use `bun run check:agents` after updating those files to keep them concise and aligned with the project's configured context window policy.
- The same logic is available in-product through `bun run spm agents check`.
- `bun run spm status` includes an AGENTS health summary so instruction drift shows up in normal PM flow.
- The repo-local AGENTS maintenance skill lives in `skills/agents-md-maintainer/`.

The AGENTS checker now reads `.specpm/config.toml` for project-standard budgets, including:

- `agents.context_window_tokens`
- root and chain context-ratio targets
- absolute hard caps that keep the project from drifting into oversized always-on instructions

## Testing

```bash
bun test
```
