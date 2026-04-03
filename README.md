# spec-embryo

`spec-embryo` is a local-first, spec-first, CLI-first project memory and orchestration tool for AI-assisted software work. It attaches to a repo's documentation surface when that is a good fit and otherwise creates its own `spm/` home. Durable memory stays readable in Markdown with TOML frontmatter while deterministic TypeScript derives status, resume context, and next actions from those files.

## Philosophy

- Local-first: the repo is the source of truth.
- Deterministic-first: parsing, linking, validation, git inspection, and next-action derivation stay in local code.
- Spec-first: specs anchor work; tasks attach to specs.
- Review-gated execution: implementation work should pass through review before it is marked done, and review findings must be fixed before a task leaves the review gate.
- Resume-friendly: current state and handoffs make interrupted work easy to continue.
- Agent-native without agent-dependence: prompt-return is first-class, subprocess backends are adapters, and the tool is useful with zero agent configured.

## V1 workflow

```bash
bun run spec-embryo init
bun run spm init
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

You can also run the entrypoint directly:

```bash
bun run src/index.ts status
```

`spm` is the primary short command. `spec-embryo` is the long-form name.

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

- `init`: discover a docs/specs surface when appropriate and create the managed memory home.
- `reshape`: bring project memory back to the standard managed layout if it drifted.
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
- prompt text file token: `{prompt_text_file}` or legacy `{prompt_file}`
- prompt bundle file token: `{prompt_bundle_file}` or `{bundle_file}`
- env vars: `SPM_BACKEND_NAME`, `SPM_PROJECT_ROOT`, `SPM_PROMPT_FILE`, `SPM_PROMPT_TEXT_FILE`, `SPM_PROMPT_BUNDLE_FILE`

That keeps prompt-return and subprocess execution aligned instead of making each backend invent its own prompt packaging.

## What is implemented now

- Bun + TypeScript CLI with small, typed modules
- Markdown + TOML frontmatter document model
- Deterministic parsing and validation
- Git-aware status and resume summaries, including deterministic changed-item derivation
- Task dependency graph and simple critical path derivation
- Local SvelteKit workspace launched through `spm ui`
- Workspace views for overview dashboard, task Kanban, Specs, and deterministic Gantt timeline
- Multi-spec and lifecycle-window filters for analytical Specs and Gantt slices, including archived work when the goal is slice analysis instead of active-board hygiene
- Prompt-return backend for agent-safe orchestration
- Handoff file generation
- Deterministic spec/task creation with automatic back-linking
- Initial spec/task/current-state templates and seed files

## Architecture

Architecture details live in [docs/architecture.md](docs/architecture.md).

Spec format details live in [docs/spec-format.md](docs/spec-format.md).

## Agent guidance

- Root repo guidance lives in [AGENTS.md](AGENTS.md).
- Growing areas also have local `AGENTS.md` files with folder-specific context.
- Use `bun run check:agents` after updating those files to keep them concise and fast.
- The same logic is available in-product through `bun run spm agents check`.
- `bun run spm status` includes an AGENTS health summary so instruction drift shows up in normal PM flow.
- The repo-local AGENTS maintenance skill lives in `skills/agents-md-maintainer/`.

## Testing

```bash
bun test
```
