# AGENTS

Read this first, then read the nearest nested `AGENTS.md` in the folder you are changing.

## Project shape

`spec-embryo` is a local-first, spec-first, CLI-first project memory tool.

CLI names:

- primary short binary: `spm`
- long-form binary: `spec-embryo`
- only use `spm` or `spec-embryo` in this repo

Core layers:

- storage/IO: `src/storage.ts`, `src/frontmatter.ts`, `src/repository.ts`
- domain schemas: `src/domain.ts`
- deterministic engine: `src/engine.ts`
- product services: `src/services/`
- CLI surface: `src/index.ts`, `src/cli.ts`, `src/commands/`
- execution backends: `src/backends/`
- managed memory home: `docs/spm/` or `spm/`
- visual server: `web/`
- docs and skills: `docs/`, `skills/`, `.specpm/`

## Working rules

- Keep deterministic logic as the default. Do not introduce model-dependent behavior when explicit code is enough.
- Prefer updating source-of-truth docs with code: specs, tasks, current state, handoffs, and relevant `AGENTS.md`.
- When working on the Spec Embryo repo itself, use the repo-local skill at `skills/spm-self-hosting/SKILL.md`.
- When `spm` already provides the needed project-memory view, use the CLI before falling back to raw file inspection.
- When touching the local dashboard, keep `web/` as a read-only view over shared deterministic services rather than inventing web-only parsing or state.
- When authoring or materially revising a spec, use `skills/spec-writer/SKILL.md`, iterate key decisions, then use `skills/spec-reviewer/SKILL.md` and fix findings before finalizing.
- For npm releases, use `skills/publish/SKILL.md`; stop before final `bun publish` and hand the command to the user for 2FA.
- Treat `review` as a real gate. If review finds issues, keep the task in `review` or move it back; use `done` only after fixes.
- After review fixes, commit before the next slice so diffs and reviews stay clean.
- Keep folder-local `AGENTS.md` files additive. Root policy lives here; nested files should only add local context.
- If you create a growing subsystem or folder, add a local `AGENTS.md` there early.
- Always aim for at least 80% test coverage overall.
- Add or update tests with code changes unless the code is genuinely untestable and the reason is explicit.

## Nexus Coexistence

- Use `spm` as the source of truth for specs, tasks, current state, handoffs, adoption structure, and deterministic workflow.
- Use Nexus for code impact, related-code, and blast-radius analysis only.
- Do not let Nexus replace or overwrite root `AGENTS.md`; keep Nexus guidance additive or scoped below the root.

## Required AGENTS maintenance

After any big chunk of work, update the relevant `AGENTS.md` files before finishing. Treat work as a big chunk when any of these are true:

- folder purpose changed
- new commands, schemas, workflows, or invariants were added
- file layout changed materially
- more than a few files in one area changed
- a future agent would likely misunderstand the new shape without fresh local guidance

When updating any `AGENTS.md`, use `skills/agents-md-maintainer/SKILL.md`. If AGENTS maintenance workflow, token budgets, or checker behavior changes, update that skill too.

## Size and performance policy

Budgets here are approximate and enforced by `bun run check:agents` plus `.specpm/config.toml`.

The current default assumes a `400000` token GPT-5/Codex-sized context window and derives root + chain budgets from context ratios. Folder-local budgets scale from that root policy.

Rules of thumb:

- root `AGENTS.md`: keep it concise even if config allows more
- scoped folder `AGENTS.md`: usually much smaller than root
- deep leaf `AGENTS.md`: prefer the smallest file that still prevents future confusion
- do not expand AGENTS files just because the configured context window is larger

Rules:

- Prefer bullets and links over repeated explanation.
- Move detailed process, examples, or rationale into nearby docs or skill references instead of bloating `AGENTS.md`.
- Do not copy root guidance into nested files.

## Deterministic upkeep

Before wrapping a change that touched repo structure or instructions:

1. Update the nearest `AGENTS.md` files.
2. Run `bun run check:agents` or `bun run spm agents check`.
3. If AGENTS workflow changed, update `skills/agents-md-maintainer/SKILL.md`.

## Fast pointers

- product overview: `README.md`
- architecture: `docs/architecture.md`
- current state: `docs/spm/current.md`
- local AGENTS maintenance skill: `skills/agents-md-maintainer/SKILL.md`
- local self-hosting skill: `skills/spm-self-hosting/SKILL.md`
- local spec authoring skills: `skills/spec-writer/SKILL.md`, `skills/spec-reviewer/SKILL.md`
- AGENTS size checker: `scripts/check-agents.ts`
