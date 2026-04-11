+++
doc_kind = "spec"
id = "SPEC-018"
title = "Add one-step Nexus setup orchestration"
summary = "Let an external-project agent ask once and have spm prepare the bounded Nexus setup through a dry-run/apply command instead of manually piecing together doctor, init, config, and AGENTS edits."
status = "done"
task_ids = ["TASK-065"]
tags = ["nexus", "adoption", "agents", "cli"]
updated_at = "2026-04-11T20:13:57.827Z"
+++

# Problem

SPEC-017 made Nexus coexistence explicit, but the activation workflow is still too advisory. A human or external-project LLM has to discover the right sequence across `spm doctor --verbose`, `spm init`, `.specpm/config.toml`, `AGENTS.md`, ignore rules, and verification commands.

That is exactly the kind of choreography `spm` should own. A repo agent should be able to say "prepare bounded Nexus support," get a clear dry-run plan, ask the human once, and then let `spm` apply the durable repo-local changes.

Without a first-class setup flow, old or partially refreshed repos can learn that Nexus exists but still fail to:

- enable `[nexus]` in the project config
- add the AGENTS coexistence contract in the right place
- keep `.gitnexus/` and `.claude/` local artifacts out of source control
- refresh adoption artifacts with current guidance
- re-run the correct verification commands

# Goals

- Add a dedicated `spm nexus setup` command that plans the bounded Nexus setup for the current repo.
- Default to read-only dry-run behavior so an agent can ask the human before writing.
- Add an explicit `--apply` path that updates the repo-local files needed for Nexus coexistence.
- Keep `doctor` read-only and focused on validation.
- Keep `init` focused on adoption and artifact seeding rather than overloading it with optional integration setup.
- Make the command output useful to another LLM: what will change, what is already present, what still requires human action, and which verification commands to run next.

# Non-Goals

- Do not install Nexus or any npm/global package from `spm`.
- Do not execute GitNexus indexing or analysis commands from this setup flow.
- Do not make Nexus a required dependency for normal `spm` commands.
- Do not build a deep runtime Nexus API/MCP integration yet.
- Do not let the setup flow overwrite large, human-authored `AGENTS.md` content.

# Constraints

- The default command must be safe for an already-running agent to execute without changing files.
- Applying the setup must be deterministic and idempotent.
- Existing config values should be preserved unless the user explicitly requests a different Nexus command or root AGENTS mode.
- Root `AGENTS.md` must remain owned by the repo's normal agent policy. Nexus wording is additive.
- `root_agents_mode = "reference-only"` should add or verify root guidance.
- `root_agents_mode = "scoped"` should allow the coexistence contract to live in a nested `AGENTS.md`, but the first implementation may guide toward root reference-only as the default.
- Local `.gitnexus/` and `.claude/` artifacts must stay untracked when the command applies setup.

# Proposed Approach

Add a new command group:

```text
spm nexus setup [--apply] [--command gitnexus] [--root-agents-mode reference-only|scoped] [--json]
```

Behavior:

- Without `--apply`, render a dry-run plan and do not write files.
- With `--apply`, perform the planned deterministic changes.
- Default command value should be `gitnexus`, because that is the actual binary used by the Nexus package we tested.
- Default root AGENTS mode should be `reference-only`, because it gives other agents the safest single place to learn the bounded contract.
- Return structured JSON when `--json` is provided.

# Detailed Specification

The setup planner should inspect:

- `.specpm/config.toml`
- root `AGENTS.md`
- `.gitignore`
- managed adoption artifacts under the configured memory home
- current doctor findings, when available

The plan should include actions for:

- writing or updating `[nexus]` in `.specpm/config.toml`
- adding bounded Nexus coexistence wording to root `AGENTS.md` for `reference-only`
- adding `.gitnexus` and `.claude` to `.gitignore`
- refreshing the migration guide and direct agent brief so another LLM can read the current Nexus process
- recommending, but not running, `spm doctor` and `gitnexus analyze --skip-agents-md --force <repo>`

The apply path should:

- create `.specpm/config.toml` only if the repo is already adopted or has a readable config; otherwise it should fail with a clear message telling the user to run `spm init` first
- update existing `[nexus]` values without duplicating the section
- append a short `## Nexus Coexistence` section to root `AGENTS.md` only when missing
- append ignore rules only when missing
- refresh adoption artifacts through the existing deterministic adoption rendering helpers
- preserve unrelated file content and comments where feasible

The human output should have:

- a status line such as `Nexus setup plan` or `Applied Nexus setup`
- a "Planned changes" or "Applied changes" section
- an "Already ok" section for idempotent no-ops
- a "Next commands" section
- a clear note that `spm` does not install Nexus and the human remains responsible for upstream installation

# Edge Cases

- Repo has no `.specpm/config.toml`: dry-run should explain that adoption comes first; apply should fail without creating a partial Nexus config.
- Config has no `[nexus]` section: apply should insert one before backend sections.
- Config already has `[nexus] enabled = false`: apply should enable it and preserve command/mode overrides unless CLI flags request new values.
- Config has an invalid `root_agents_mode`: setup should fail through the existing config parser rather than silently "repairing" an unsafe value.
- Root `AGENTS.md` is missing: apply may create a minimal file with the Nexus coexistence contract only if the repo has no existing root guidance; otherwise dry-run should make the creation explicit.
- `.gitignore` is missing: apply should create it with only the local artifact ignore rules.
- Adoption artifacts are missing: apply should create or refresh them using the configured memory home.

# Acceptance Criteria

- `spm nexus setup` prints a read-only plan by default.
- `spm nexus setup --apply` updates config, AGENTS guidance, ignore rules, and adoption artifacts in one deterministic pass.
- The command is idempotent: running `--apply` twice should not duplicate config sections, AGENTS sections, or ignore rules.
- `spm nexus setup --json` returns the same plan/apply information in structured form.
- `spm doctor` remains read-only.
- `spm init` remains focused on adoption and does not become the Nexus activation command.
- Regression tests cover dry-run, apply, and idempotent re-apply behavior.

# Open Questions

- Should a later slice add `spm nexus status` or `spm review prepare` that calls GitNexus once the external command is installed?
