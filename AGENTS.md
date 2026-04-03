# AGENTS

This is the root operating guide for humans and agents working in this repo. Read it first, then read the nearest nested `AGENTS.md` in the folder you are changing.

## Project shape

`spec-embryo` is a local-first, spec-first, CLI-first project memory tool.

CLI names:

- primary short binary: `spm`
- long-form binary: `spec-embryo`
- only use `spm` or `spec-embryo` in this repo

Core layers:

- storage and file IO: `src/storage.ts`, `src/frontmatter.ts`, `src/repository.ts`
- domain model and schemas: `src/domain.ts`
- deterministic engine: `src/engine.ts`
- deterministic product services: `src/services/`
- CLI surface: `src/index.ts`, `src/cli.ts`, `src/commands/`
- execution backends: `src/backends/`
- managed memory home: `docs/spm/` or `spm/`
- visual server: `web/`
- repo docs and skills: `docs/`, `skills/`, `.specpm/`

## Working rules

- Keep deterministic logic as the default. Do not introduce model-dependent behavior when explicit code is enough.
- Prefer updating the nearest source-of-truth docs together with code: specs, tasks, current state, handoffs, and relevant `AGENTS.md`.
- When working on the Spec Embryo repo itself, use the repo-local skill at `skills/spm-self-hosting/SKILL.md`.
- When `spm` already provides the needed project-memory view, use the CLI before falling back to raw file inspection.
- When touching the local dashboard, keep `web/` as a read-only view over shared deterministic services rather than inventing web-only parsing or state.
- When authoring or materially revising a spec, use `skills/spec-writer/SKILL.md`, iterate the core decisions with the human user, then use `skills/spec-reviewer/SKILL.md` and fix the spec before finalizing it.
- Treat `review` as a real gate for tasks. If review finds issues, keep the task in `review` or move it back to active work; use `done` only after the findings are fixed.
- After review fixes are in, commit before the next slice so later diffs and reviews stay clean.
- Keep folder-local `AGENTS.md` files additive. Root policy lives here; nested files should only add local context.
- If you create a subsystem or folder likely to grow, add a local `AGENTS.md` there early.
- Always aim for at least 80% test coverage overall.
- Whenever you add or materially change code, add or update tests in the same change unless the code is genuinely untestable and the reason is explicit.

## Required AGENTS maintenance

After any big chunk of work, update the relevant `AGENTS.md` files before finishing.

Treat work as a big chunk when any of these are true:

- folder purpose changed
- new commands, schemas, workflows, or invariants were added
- file layout changed materially
- more than a few files in one area changed
- a future agent would likely misunderstand the new shape without fresh local guidance

When updating any `AGENTS.md`, use the repo-local skill at `skills/agents-md-maintainer/SKILL.md`.

If the AGENTS-maintenance workflow, token budgets, or checker behavior changes, update that skill in the same change. Do not let the skill drift from actual practice.

## Size and performance policy

There is no single official vendor-prescribed sweet spot for repo instruction files. The practical policy here is inferred from official guidance that longer prompts increase cost and latency, long-context works best when tightly structured, and static instructions should stay concise.

Token budgets here are approximate and enforced by `bun run check:agents` using a simple estimator.

Targets:

- root `AGENTS.md`: target 600-900 tokens, hard cap 1200
- scoped folder `AGENTS.md`: target 150-350 tokens, hard cap 500
- deep leaf `AGENTS.md`: prefer 80-250 tokens
- cumulative active chain of root + nested `AGENTS.md` for a working path: target under 1800 tokens, hard cap 2200

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
- local visual server: `web/`
- local AGENTS maintenance skill: `skills/agents-md-maintainer/SKILL.md`
- local self-hosting skill: `skills/spm-self-hosting/SKILL.md`
- local spec authoring skills: `skills/spec-writer/SKILL.md`, `skills/spec-reviewer/SKILL.md`
- AGENTS size checker: `scripts/check-agents.ts`
- product AGENTS service: `src/services/agents.ts`
