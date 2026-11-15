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
bun run spm portfolio status
bun run spm profile list
bun run spm import legacy --source docs --apply
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
bun run spm release plan
bun run spm tests diagnose
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
- `doctor --json`: return structured findings plus deterministic migration, structured source-material inspection hints, structured tag guidance, structured partial-adoption checks, workflow-loop command guidance, structured doctor-mode guidance, memory-workflow guidance, structured memory-workflow command guidance, direct-agent-command guidance, typed direct-agent command suggestions, bounded external `AGENTS.md` snippet guidance, structured Nexus coexistence guidance, structured Nexus setup flow, typed Nexus setup command suggestions, structured Nexus setup review checks, capability-refresh metadata, typed capability-refresh command suggestions, structured capability-refresh review checks, version/update metadata, and the direct agent brief for agent continuation.
- `agent brief`: return one short deterministic "how to use SpM here today" workflow for agents, with structured source-material inspection hints, structured tag guidance, the default resume loop, structured partial-adoption checks, structured workflow-loop command guidance, structured doctor-mode guidance, scoped-memory guidance, structured memory-workflow command guidance, structured direct-agent-command guidance, typed direct-agent command suggestions, bounded external `AGENTS.md` snippet guidance, structured Nexus coexistence guidance, structured Nexus setup flow, typed Nexus setup command suggestions, structured Nexus setup review checks, version-aware capability refresh, typed capability-refresh command suggestions, structured capability-refresh review checks, and matching discoverability from the broader adoption outputs in either human or JSON form.
- `agent snippet`: return only the bounded external `AGENTS.md` snippet so humans or wrapper agents can retrieve the additive SpM guidance directly in human or JSON form.
- `agents check`: validate `AGENTS.md` files against the project-level context-ratio budget policy in `.specpm/config.toml`.
- `nexus setup`: preview or apply the bounded optional Nexus setup across config, AGENTS guidance, local artifact ignore rules, and adoption artifacts.
- `portfolio register/list/status/search/link`: keep a user-local registry of SpM projects, inspect cross-project state, search project summaries, and model explicit project relationships.
- `profile list/show` plus `init --profile`: seed deterministic setup conventions for common repo shapes such as libraries, services, frontend apps, and infrastructure repos.
- `import legacy`: preview or apply deterministic normalization from legacy planning docs into canonical specs and tasks.
- `memory note`: create, update, archive, restore, and list scoped `memory-note` documents through deterministic CLI flows instead of editing `.specpm/memory/...` files by hand.
- `memory query`: retrieve managed docs by text, kind, scope, status, tags, IDs, backlinks, one-hop neighborhoods, and explicit ranking controls with compact default output, stable JSON, deterministic match reasons, and body-text retrieval over managed Markdown.
- `memory links`: inspect outgoing links, backlinks, and deterministic one-hop or two-hop neighborhoods for any managed doc.
- `memory brief`: compress managed memory into compact implementation, review, or migration context for a doc, spec, task, or topic query, including why a center or text match was selected, smaller section-level evidence slices, and explicit inclusion/exclusion of neighbors, current state, handoffs, and memory scopes.
- `memory pack`: build a first-class compact context pack for implementation, review, or migration work so another human or agent can start from must-read context, inspect top evidence sections early, and expand into supporting or offloaded detail only when needed.
- `memory scopes`: inspect the configured session, repo, and org-style memory namespaces plus their write-policy expectations.
- `memory consolidate`: dry-run or apply promotion of a session `memory-note` into durable repo memory, with explicit duplicate, contradiction, related-doc, and staleness signals before any write happens.
- `memory eval`: run deterministic retrieval, pack, consolidation, and source-of-truth injection scenario suites so context work is measured with repeatable pass/fail signals instead of intuition.
- `status`: inspect current repo state, linked work, blockers, git changes, changed managed docs, and critical path.
- `current show` / `current set`: inspect and deterministically update the explicit current-state checkpoint.
- `ui`: start the local SvelteKit dashboard that visualizes the managed project memory.
- `resume`: build deterministic resume context for a human or an already-running agent; `--since <commit>` adds a committed-history interruption window, and `--max-context-bytes` bounds rendered prompt text (32768 UTF-8 bytes by default).
- `handoff`: write a durable handoff Markdown checkpoint from the current state.
- `hooks install/plan`: configure bounded local repo-event hook guidance and preview deterministic post-event actions.
- `release plan/notes/recommend`: assemble release readiness, version-bump guidance, and release-note candidates from managed state.
- `spec list`: list specs and their linked tasks.
- `spec create`: create a new spec doc with a deterministic ID and optional linked tasks.
- `spec set-status`: update a spec status deterministically in-place.
- `spec import-prompt`: scan an existing docs/specs folder and emit an agent-ready migration bundle for Spec Embryo format.
- `task list`: list tasks with dependency and status details.
- `task create`: create a new task doc with a deterministic ID and update linked specs automatically.
- `task set-status`: update a task status deterministically in-place, including the explicit `review` stage before `done`.
- `task archive` / `task archive-done` / `task archive-cancelled`: archive closed tasks without deleting their durable docs.
- `task restore`: clear archival metadata so a task is visible in active-flow views again.
- `tests diagnose`: list self-hosting test areas that are sensitive to git state, locks, subprocesses, or packaged UI paths with focused rerun commands.

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

Prompt-return and subprocess adapters share one bundle and renderer. The stable prefix contains invariant instructions and output-format rules; focus, specs, tasks, context packs, Git observations, and interruption windows live in the variable tail. Each rendered block appears once. This separation does not guarantee a provider cache hit.

`spm resume --backend prompt --json` retains the legacy `resume` and optional `interruption_window` fields and adds `schema_version`, `context_snapshot`, `context_pack`, and deterministic `warnings`. The snapshot exposes full Git HEAD/branch references or null, dirty state, a SHA-256 fingerprint of selected context, and source paths with hashes of the exact loaded bytes. It describes selected context, not an atomic filesystem snapshot; changes outside that selection need not invalidate the fingerprint. Missing source provenance is explicit rather than invented. Reading context works outside Git.

`--since` accepts one Git commit revision, resolved to a SHA before inspection. Its window covers commits through HEAD; staged, unstaged, and untracked changes remain separate in `changed_items`. Invalid revisions, options, ranges, or unavailable history produce an unavailable window during reads and previews, and prevent `--spawn` before artifacts are written. Dates and handoff IDs are not separate revision formats.

`--max-context-bytes` accepts integers from 4096 to 1048576. The limit covers the complete assembled prompt, including prefix and tail, measured in UTF-8 bytes rather than tokens. Oversized text keeps identity/focus and blocked state first, then useful references with omission counts and an expansion command. JSON data stays complete; only rendered prompt fields are bounded. Invalid limits fail with usage exit code 2.

Subprocess execution requires `--spawn`. Preview artifact paths contain `{run-id}` and are templates; previews reserve no files. Actual invocations create four prompt artifacts in a private random directory under `.specpm/tmp/`, with an ownership marker. Concurrent runs use separate directories. Artifacts are removed after confirmed process closure; `--retain-artifacts` keeps them explicitly for diagnostics. Unverified process-tree closure also retains files with a warning. Crashes can leave residue; SpM does not sweep stale, foreign, or active directories.

If a same-group descendant remains alive after its parent and inherited streams close on macOS/Linux, SpM reports `unknown`, preserves the parent's exit code, and retains artifacts for that background work. It does not terminate background descendants merely because the parent exited normally.

`resume --json --spawn` emits one versioned SpM JSON document, including failures. Child stdout becomes data in `invocation.output`: at most the first 1048576 bytes, trimmed to a complete UTF-8 character, while remaining output is drained. `stdout_bytes` reports bytes received and `stdout_truncated` reports overflow. Child stderr remains diagnostic. Human execution keeps inherited terminal streams.

The invocation terminal state is `completed`, `failed`, `cancelled`, `timed_out`, or `unknown`; it includes the child's `exit_code` and `signal`. Managed cancellation also records `cancellation_signal`, so a child that exits zero after SIGINT still reports cancellation. A successful process does not verify work or mark a task done. `--timeout-ms` accepts a positive safe integer and measures elapsed time from successful spawn without resetting on activity; omitting it means no timeout. SIGINT/SIGTERM are forwarded to the controlled process group on macOS/Linux, with 2000 ms grace before SIGKILL and at most 1000 ms more to observe closure. Processes that deliberately detach are outside that group guarantee. Windows supports best-effort direct-child cancellation and reports `unknown` when tree closure is unverified. SIGKILL or a runtime/system crash may prevent a final envelope.

| SpM exit | Meaning |
| --- | --- |
| 0 | Read, preview, or completed process |
| 2 | Invalid usage or spawn precondition |
| 1 | Process/artifact/context failure or unknown closure |
| 124 | Timeout with confirmed closure |
| 130 / 143 | Managed SIGINT / SIGTERM cancellation with confirmed closure |

The original child exit remains in `invocation.exit_code`, including when SpM normalizes its own exit. Configured commands and arguments remain explicit; wrappers do not install tools, bypass harness permissions, retry agent calls, or parse provider-specific events.

Use `spm doctor --harness codex|claude --json` or `spm agent brief --harness codex|claude --json` when you explicitly want native harness diagnostics. Both add the same optional `harness` projection: provider, canonical executable path/null, raw and parsed version/null, probe status, capability observations, existing root instruction paths, warnings, and suggested commands. Without `--harness`, those commands keep their existing output and launch zero harness probes. A missing CLI or failed probe does not change project health.

Diagnostics resolve the selected binary from PATH and run only local `--version` / `--help` queries; Codex also uses `exec --help` and `exec resume --help`. Each process has a fixed 2000 ms deadline, ignored stdin, and a drained 65536-byte combined stdout/stderr cap. Configured backend commands/arguments are not used. No model session, authentication flow, installation, or permission bypass is requested. A help-advertised flag is `observed`; documentation is `documented`; untested compatibility remains `unverified`, including unknown and prerelease versions. The local smoke profile is dated 2026-11-15 (Codex `0.169.0-alpha.11.1`, Claude `2.1.309`) and establishes version/help observations only.

Instruction inspection reads only `AGENTS.md`, `CLAUDE.md`, `CLAUDE.local.md`, `.claude/CLAUDE.md`, `.claude/settings.json`, `.codex/hooks.json`, and `.codex/config.toml` at the project root, bounded to 65536 bytes each. It accepts regular files only, checking their type before and after a nonblocking open where supported; FIFOs and devices produce a warning without waiting for input. It does not return contents, follow paths outside the root, inspect home/transcripts, or certify effective instruction loading. Imports such as `@AGENTS.md`, multiple SpM blocks, local precedence, and possible hook duplication produce review guidance. `spm agent snippet --harness codex|claude` reuses bounded shared adoption guidance with no probes or writes. Keep root AGENTS as the common source; review whether a Claude import is actually needed before adding a bridge. Diagnosis creates no CLAUDE file or hooks.

Native context hooks are a separate opt-in flow: `spm hooks plan --harness codex|claude --json` previews exact config/ownership diffs; `hooks install --harness ... --apply` writes them. Without `--apply`, install returns the same preview. `hooks remove --harness ... [--apply]` previews/removes only verified owned entries. Git `--event`/`--events` flags remain separate and cannot be combined with `--harness`.

The preset adds one `SessionStart` matcher for startup, resume, and compact, running the constant command `spm agent hook-context --harness <provider>` with a five-second native timeout. Codex uses `.codex/hooks.json`; Claude uses `.claude/settings.json`. These formats follow the [Codex hook reference](https://learn.chatgpt.com/docs/hooks) and [Claude hook reference](https://code.claude.com/docs/en/hooks). SpM does not install a second PostCompact injection, change personal configuration, grant trust, enable permissions, or install a CLI. The command requires a suitable `spm` on PATH; a missing binary produces a useful preview warning.

Native configuration and `.specpm/harness-hooks.json` ownership are updated under the shared repository write lock, using an atomic rename per file. Foreign keys and handler order are preserved. Ownership requires the complete canonical entry hash; changes to timeout or any other entry field are conflicts. An identical preexisting entry requires explicit adoption through apply, which records the manifest without rewriting its config bytes. A group mixing SpM and foreign handlers, or a matching signature with differing fields, is never adopted or replaced. If config writes succeed but manifest persistence fails, the result reports a partial installation; the next preview proposes exact adoption. Files are individually atomic, with no multi-file transaction promise. External/dangling symlink targets and nonregular config files are rejected.

The hook handler searches upward from the process's real cwd for the nearest `.specpm/config.toml`, stopping at the first Git boundary or filesystem root. Input cwd/transcript fields are ignored. Stdin is limited to 65536 valid UTF-8 bytes and a one-second read deadline; the complete handler has a four-second deadline. Context loading runs in a private read-only subprocess with the same executable/package entrypoint, so a blocked synchronous Git query can be terminated with its worker group. Unknown input, unmanaged repos, read failures, and deadlines return a native empty-context warning with exit zero. Windows termination remains best-effort for descendants.

Successful hook output contains at most 8192 UTF-8 bytes of additional context: static SpM consultation instructions and a clearly delimited JSON list of canonical IDs/paths, status counts, snapshot hash, and omission count. It excludes focus, titles, summaries, bodies, model output, scoped/org notes, and transcripts. The manual `spm resume --backend prompt --json` command remains the expansion path. Hooks never replace AGENTS or give project data higher authority.

`resume --protocol codex-jsonl|claude-json|claude-stream-json` selects an explicit parser for its matching backend. SpM adds no provider flags: configure Codex args such as `["exec", "--json", "{prompt_text}"]`, or Claude args such as `["-p", "{prompt_text}", "--output-format", "json"]`; streaming Claude output also needs `stream-json` and `--verbose`. Preview shows the selection and requirements. See the [Codex non-interactive reference](https://learn.chatgpt.com/docs/non-interactive-mode) and [Claude programmatic reference](https://code.claude.com/docs/en/headless). Versioned synthetic fixtures validate parsing without claiming live model compatibility.

With a protocol, stdout is piped even for human output and `invocation.output` is deliberately empty. Only `native_result.final_text` carries response text; no reasoning/tool transcript is retained. `stdout_bytes` still counts all drained bytes; `stdout_truncated` still means the P0 1 MiB threshold was exceeded, independently of deliberate omission. Without `--protocol`, generic P0 behavior stays unchanged. Process and native terminal are separate: native success never overrides process failure, cancellation, timeout or unknown closure. Native failed/unknown makes an otherwise completed execution exit 1.

JSONL parsers keep a UTF-8 decoder, at most a 256 KiB line, session/terminal state, a 64 KiB final response and at most 32 warnings of 256 bytes plus an omission count. They drain beyond 1 MiB and can observe a later terminal. Oversized lines, malformed/incomplete JSON, invalid UTF-8, contradictory IDs and incompatible terminals leave a sticky unknown result. EOF without a newline is valid if the final JSON record is complete. Unknown valid events/fields do not prove success or fail parsing. Claude monolithic JSON above 1 MiB is incomplete.

`--record --spawn` creates an exclusive private local receipt at `.specpm/runs/<uuid>.json` after process handling and artifact cleanup. Reads/previews write nothing; without `--record`, no history is saved. Receipts contain provider/protocol/root/session identity, initial/final observed snapshot descriptors, process/native terminal metadata, observed references, byte guards, timestamps and warnings. They exclude stdout/stderr, response text, environment, transcripts and reasoning; `verification` starts empty. Agent claims and exit zero are not test evidence. SpM does not edit `.gitignore`; consider a local Git exclusion yourself. There is no automatic cleanup: delete only a receipt you explicitly select.

`--session-ref <uuid>` requires an exact SpM receipt with matching canonical repo/worktree, provider and protocol, a bounded exact schema and a valid native session ID. Paths, `latest`, symlink files/directories, whitespace/control characters, leading `-` and IDs over 512 UTF-8 bytes are rejected before artifacts or execution. Configured args must contain `{session_id}`, replaced as a literal argv value. Missing identity or a moved/different repo/provider requires new portable context. SpM never searches private harness session folders or reuses old prompts; every invocation builds current context.

`spm handoff --from-run <uuid> --json` previews an observed checkpoint. `--apply` uses the existing repository workflow only after independently checking HEAD, exact NUL-delimited expanded Git paths, selected managed bytes and files changed initially or finally. A second edit to an already dirty file is detected even when Git status and the public context fingerprint stay unchanged. Missing files have a sentinel; code symlinks hash link data without following targets. Selected managed symlinks remain incomplete (`managed-source-bytes-unverified`). Guards are observations, not atomic snapshots or coverage of unobserved/ignored target contents.

Only the exact own receipt is excluded. During apply, only the verified current untracked lock owner file may additionally be excluded; other locks, extra files and `.specpm` changes remain observable, and ownership is rechecked before writing. Stale/incomplete guards return a draft/conflict without writing. Unknown tree closure is permanently incomplete (`tree-closure-unverified`), even when later bytes appear stable. Limits (10000 paths / 1 MiB receipt) disable apply while preserving bounded evidence. No force path or automatic task completion exists. Post-child evidence errors preserve `invocation` and `native_result` alongside `evidence_error` and retain P0 exit precedence. Legacy handoff without `--from-run` stays unchanged.

## What is implemented now

- Bun + TypeScript CLI with small, typed modules
- Markdown + TOML frontmatter document model
- Deterministic parsing and validation
- Git-aware status and resume summaries, including deterministic changed-item derivation with shared identity/path human summaries plus compact raw status codes for structured consumers
- Task dependency graph and simple critical path derivation
- Local SvelteKit workspace launched through `spm ui`
- Compact responsive workspace with Overview, spreadsheet-style task Table with optional Board, spec cards, and grouped Timeline; page sizes 50/100/200 keep lists bounded
- Shared deterministic search, effective-status filters, stable sorting, archive scope, and lifecycle-window metrics; legacy analytical links retain their archive semantics with a visible label
- Searchable, paginated spec-filter options with selected values preserved across option pages and no-JS GET navigation
- Controlled manual/focus refresh keeps the last data, URL, scroll, and focus on failure, with Retry; canonical details remain outside background refresh until draft-aware inspection is implemented
- Task Table supports keyboard cell navigation, page-local range selection, safe TSV/ID copy, resizable/reorderable columns and per-project preferences; `simple=1` and no-JS GET navigation retain native table access
- Spec tables and the persistent inspector follow in subsequent SPEC-062 slices
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
- User-local portfolio, profile, legacy-import, hook, release, JSON-contract, and test-diagnostic foundations for using SpM consistently across many projects

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
