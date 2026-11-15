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

The SvelteKit workspace lives under `web/` and is launched through `spm ui`. It renders canonical managed memory through shared services; the spec-question action is its sole file mutation.

- `workspace-query.ts` normalizes URL facets, archive scope, stable sorting and pagination. Specs keep canonical status separate from the task scope used for progress. Lifecycle windows use completion/cancellation timestamps. Legacy analytical links retain archive behavior with an explicit notice.
- `workspace.ts` projects bounded task/spec pages, searchable spec options, Overview signals, or timeline groups. Lists contain no document bodies, foreign-view arrays, or eager full spec catalog. The existing `buildDashboardData` facade keeps its public defaults; list/detail paths do not invoke its status/critical-path/timeline work.
- `engine.buildTaskAnalysisIndex` builds canonical ID, unmet-dependency and direct-dependent indexes in O(V+E). Duplicate dependency references count a dependent once; only `done` satisfies a dependency. Status/dashboard reuse projection-local indexes; critical-path and Timeline placement now use iterative traversals with legacy ordering/cycle semantics preserved (TASK-136).
- `lib/server/workspace.ts` stores a Promise on request locals before awaiting it, so layout and page reuse one canonical context/index. There is no global project cache. Detail builders accept this loaded source while root-directory wrappers remain compatible. Filesystem consistency is best effort, not transactional.
- Layout sends project/git plus optional selected-detail data on exact list routes. SSR page loads and read-only GET `/workspace-data` call the same discriminated route builder. Its no-store envelope includes schemaVersion 1, route, requestKey, revision, generatedAt, shell and the route DTO. `/workspace-options` returns searched/paged options plus selected IDs, not all titles. An omitted oversized option label carries a visible reason and navigable ID.
- Request keys describe syntax-normalized URL intention before dataset-dependent ID filtering/page clamping. Revisions fingerprint loaded inputs/projections and exclude wall clock. Effective pagination and unavailable spec IDs are explicit metadata; refresh preserves URL intention, announces clamping/missing filters and accepts records that reappear.
- The Svelte route resource initializes from SSR, owns cancellation/generation/sequence/deadline, and registers with the shell. Controlled fetch refresh commits shell/data atomically; failures keep the prior snapshot with `Datos anteriores` and Retry. Visible focus refetch is debounced 150 ms after more than 5 s since the last attempt. It never uses SvelteKit invalidation/navigation as a failure-preserving transport.
- Canonical details do not register refresh before drawer/draft-aware support. Their existing question form still submits to `answerOpenQuestions`, shared repository rewriting and evaluation. No-JS filters, options, pagination, detail links and canonical question POST remain usable.

Canonical missing-detail GET now returns HTTP404 through scoped error views retaining the shell. GET `/workspace-detail?kind=task|spec&id=...` validates identity before IO, then uses the same request-local detail projector as SSR. It returns no-store typed200/404 or transport500; an inspector missing state never drops the list.

The layout provides one persistent inspector controller/host. Universal layout loading imports only the selected detail component for direct SSR; closed lists never import Detail/Mermaid. JavaScript opening loads code and DTO under identity/generation ownership, with cancellation,15-second deadline, local Retry and prior same-identity content on failure. A consumed SSR seed is never reused after close/reopen. Questions remain canonical links.

`workspaceURL()` reads Kit page.url/page.state signals and returns a copied browser address URL (SSR uses page.url): installed shallow APIs change history/state without updating page.url. Identity remains in URL. Inspector-only changes retarget the list resource instead of reseeding an old SSR result, clear neither selection nor drafts, and never alter Timeline selected_task. Open pushes once; entity/section changes replace. Close uses Back only with verified in-memory immediate predecessor proof; direct/reload/changed-filter entries replace the current URL without inspection.

The host is one div switching complementary/dialog semantics without remounting its detail, reader, focus or Mermaid subtree. Dock requires viewport>=1200 plus a360–640px preference and>=560px actual table region; otherwise overlay/fullscreen owns inert siblings and a focus trap. Width changes have pointer and keyboard controls. Read-only transitions are centralized for the forthcoming question guard; shallow popstate is not assumed cancelable.

Inspector relation windows render at most100 items per collection (Spec linked tasks share one window across groups), retain original ordering/metrics, clamp on refresh and expose a canonical complete-collection link in SSR. Current DTOs and canonical collections remain complete: the mandatory TASK-138 checkpoint will bound producer payloads/canonical/no-JS collections and address measured latency before question integration. These DOM limits do not certify the300ms detail budget. Mermaid SSR/no-JS shows source and a JavaScript notice; zoom controls appear only with usable SVG.

Tasks default to the bounded Table; `view=board` explicitly limits scope to unarchived, while `simple=1` forces native Table semantics. Specs uses the same bounded DataTable and ColumnDef contracts, page-local selection, clipboard and project/entity preferences over WorkspaceSpecRow. Spec status is independent of linked-task scope; progressIsSubset labels scoped/windowed metrics. Specs row links remain canonical until its later inspector/question integration; Tasks plain identity activation opens inspection.

- `components/data-table/` accepts typed column descriptors and a current page, never fetching or deriving domain data. The same descriptors supply rendering and safe TSV text. Native SSR headers/links become a one-target roving grid only after mount; simple mode keeps normal Tab behavior.
- Row-ID/column-key focus and page-local selection survive same-query refresh by ID reconciliation. User query changes clear selection; data-page clamping alone does not change URL intention. Hidden/reordered columns reconcile focus by stable key.
- Versioned column/density preferences use an opaque SHA-256 namespace from the canonical realpath loaded on the server. Distinct roots with equal names remain separate; symlink aliases share preferences. Title sizing stays automatic until explicit numeric/pointer sizing; only the base width and mode are stored.
- Toolbar search replaces history after 150 ms; presets preserve independent facets while changing only scope/status/page. Facet Apply and SSR GET links remain explicit navigation. Clipboard denial offers selectable text without reporting success.

Bounded detail transport, guarded question drafts and Timeline volume presentation remain subsequent SPEC-062 slices. Measurements and browser evidence live in `web/verification/`.

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

The optional wrapper uses `services/harness-artifacts.ts` to reserve a random private run directory under `.specpm/tmp/`, mark its ownership, and write four artifacts. Preview plans use `{run-id}` path templates without reserving or writing. Successful, failed, timed-out, and cancelled invocations clean only their own verified directory after closure. Explicit `--retain-artifacts`, changed ownership markers, and unknown process-tree closure preserve diagnostics; no code scans or deletes other runs. Crash residue can remain and any future stale cleanup must verify ownership and age.

Normal POSIX stream closure also checks the controlled group. A surviving same-group background descendant yields `unknown` with the original parent exit code and retained artifacts, even when that descendant inherited no pipes. Normal parent exit does not authorize killing that background work.

`services/harness-process.ts` owns process execution independently of memory derivation. macOS/Linux spawn a controlled process group; SIGINT/SIGTERM forward to that group, wait 2000 ms, then use SIGKILL with at most another 1000 ms to confirm closure. A monotonic timeout starts at successful spawn and uses the same termination sequence. Terminal cancellation/timeout remains sticky if the child exits zero while stopping. Normal results settle on `close`, after streams finish, rather than `exit`. Windows cancellation controls only the direct child and reports unknown tree closure explicitly. Deliberately detached descendants and uncatchable runtime/system termination are outside the guarantee.

For JSON invocations, stdout is piped and continuously drained. The first 1048576 bytes are retained and decoded without an incomplete trailing UTF-8 character; total received bytes and truncation are explicit. Stderr remains inherited diagnostics; human runs inherit terminal streams. `commands/resume.ts` catches controlled usage, precondition, context, artifact, and launch failures into the shared versioned envelope, preserving the legacy `resume` key. `invocation` reports state, child exit code/signal, captured output, typed error, and warnings. SpM normalizes exits to 0 (read/preview/completed), 2 (usage/precondition), 1 (failure/unknown), 124 (timeout), or 130/143 (SIGINT/SIGTERM cancellation). The dispatcher awaits stdout flush, including large envelopes. Process success never advances task lifecycle or substitutes for review.

### Explicit harness diagnostics

`doctor --harness` and `agent brief --harness` select Codex or Claude for an optional shared `harness` projection. `buildDoctorReport` remains a project-only read with no process probes. The command layer requests `buildHarnessDiagnostics` explicitly; doctor and agent renderers consume the same projection without changing project health. `agent snippet --harness` uses the same adoption source and static instruction inspection, with probe status `not-requested` and no executable resolution/process calls. No provider is inferred from environment or backend config.

`services/harness-diagnostics.ts` separates pure capability projection from injectable executable resolution and probes. `services/harness-probe.ts` searches PATH, records a canonical executable path, and accepts only `--version`, `--help`, or Codex's `exec --help` / `exec resume --help` argument lists. It invokes without a shell, ignores stdin, drains combined stdout/stderr while retaining at most 65536 bytes, and kills the controlled probe/group at the fixed 2000 ms deadline. Version/help inspection never requests a model, credentials, network operation, or installation. Missing, timed-out, failed, unknown-version, and prerelease probes preserve portable prompt-return. Observed help flags do not establish model execution, loading, or blanket version compatibility; no native flags are added automatically.

Instruction inspection is restricted to seven explicit project-root paths: AGENTS.md, CLAUDE.md, CLAUDE.local.md, .claude/CLAUDE.md, .claude/settings.json, .codex/hooks.json, and .codex/config.toml. Realpath containment includes parent directories; outside-root targets are not inspected. Canonical paths must be regular files before opening, use nonblocking/no-follow flags where supported, and are revalidated through fstat after opening. FIFOs/devices are skipped with fixed warnings. Each file read is capped at 65536 bytes with an explicit warning for omitted content. Output contains paths and fixed guidance rather than file bodies. Static imports, SpM blocks, Claude precedence, and inline/context hook overlap produce possible-conflict warnings, never claims that a harness loaded instructions. Shared AGENTS remains the source; import/bridge changes require their own requested preview/apply workflow.

### Opt-in native context hooks

`services/harness-hooks.ts` owns native presets separately from Git-event `services/hooks.ts`. Plan/install/remove commands select an explicit provider; install/remove require `--apply` to mutate. Presets use a single SessionStart matcher `^(startup|resume|compact)$`, a constant SpM command, and a five-second timeout. They target only repository-local Codex/Claude config and never register PostCompact, change trust, or alter personal settings.

The ownership manifest `.specpm/harness-hooks.json` records version, provider, target, event, and SHA-256 of each complete canonical matcher group. Exact unowned groups can be explicitly adopted without rewriting their native bytes. Mixed groups, differing complete fields, changed owned entries, or ambiguous entries produce conflicts rather than merges or duplicate installs. Apply rebuilds its plan under the existing document-create repository lock and checks observed file bytes again before each write. `harness-paths.ts` validates real parent containment, rejects unresolved/outside symlinks and nonregular files, limits JSON reads to 1 MiB, and atomically renames individual files. A failure between native config and manifest persistence is reported as recoverable partial installation; there is no multi-file transaction or force-removal path.

`commands/hook-context.ts` routes the native handler before doctor/brief loading. `harness-hook-context.ts` validates the event/source and bounded UTF-8 stdin, resolves the nearest managed root while respecting Git/worktree boundaries, and launches a private worker using the same executable/package entrypoint. A per-invocation token validates worker mode and the worker never starts another worker. The parent owns the four-second total deadline, including the one-second stdin deadline, and can kill the worker group even if context loading is blocked in synchronous Git. Worker output is captured and validated, stderr is drained, and neither stream is forwarded. The worker loads canonical repository context using its already validated configuration with scoped notes disabled and optional Git locks disabled.

Only canonical reference IDs/paths, counts/statuses, a selected-context snapshot hash, and omission count cross into additionalContext, bounded to 8192 UTF-8 bytes. Rendering whitelists fields and JSON-escapes paths; bodies, focus, titles, summaries, transcripts, and arbitrary command output never cross this boundary. The static wrapper preserves existing repository/harness authority and provides manual expansion. Recoverable failures return native SessionStart empty-context envelopes with fixed warnings and exit zero; they never block sessions or start an agent. Descendant termination on Windows is explicitly best-effort.

### Native output, receipts and observed handoffs

`harness-native.ts` implements separate Codex JSONL and Claude JSON/stream-JSON parsers with bounded incremental state. Explicit protocol selection is validated against the backend; the adapter supplies chunks while draining stdout, omits raw capture only for native protocols, and adds no provider args. No event array/transcript is retained. Invalid/oversized/conflicting records leave a sticky unknown result. Native terminal and P0 process state remain separate, with process exit precedence preserved. Versioned synthetic fixtures record official URLs/date without claiming paid execution compatibility.

`harness-run-evidence.ts` observes context before invocation and after backend cleanup. `harness-receipts.ts` writes opt-in UUID receipts using shared schema_version, exclusive create and mode 0600 where supported. Snapshot descriptors retain HEAD/branch/dirty/fingerprint without source content. No raw output, final response, environment, transcript, credentials or claimed verification is stored. There is no GC or ignore-file rewrite. Strict reads check schema/size/root/provider/protocol/session identity and reject symlink files/directories. Session substitution requires a configured `{session_id}` argv token and current context.

`harness-guard.ts` is independent of the public context fingerprint. It reads expanded Git porcelain-v1 NUL paths (including both rename paths) and streams hashes for selected managed sources and files changed initially or finally. Missing/link data is explicit; real parent containment is checked before access. Code symlinks do not imply target-content observation; nonregular managed sources remain managed-source-bytes-unverified. HEAD/path sets and file metadata are rechecked for concurrent changes. Limits or failed observations make the guard incomplete. Unknown process closure always adds tree-closure-unverified; later matching bytes never retroactively permit apply.

`harness-run-handoff.ts` builds metadata-only drafts and invokes canonical writeHandoff for requested apply. Guard comparison runs under the shared repository lock, excluding its exact own receipt rather than all `.specpm` files. `storage.withLock` supplies a frozen readonly lease: only its verified token/pid's regular no-follow owner file may be excluded if untracked and absent from recorded observations. Other/extra lock files remain visible. Ownership is revalidated after comparison and before writing. Conflicts preserve the draft without writes. Handoffs contain empty observed verification, never model response or automatic status changes. Post-child snapshot/guard/receipt failures remain in the same versioned envelope as invocation/native results.

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


### Fresh document reads

`repository.ts` decodes, parses and registers provenance from one fresh Buffer per document. `document-reader.ts` uses callback Buffer IO with a FIFO concurrency limit of 64 shared by all collections in each `loadProjectContext` call, including enabled session/org notes and current state. Standalone collections receive independent readers. Directories, config and Git remain freshly read; result ordering and fail-fast errors are preserved. Already-started reads may settle after failure, as with the previous Promise.all implementation. There is no process-global queue/cache, mtime shortcut or atomic filesystem snapshot guarantee.
