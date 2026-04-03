---
name: spm-self-hosting
description: Use when working on the Spec Embryo repository itself and you need to use the spm CLI as part of the workflow. Guides agents to inspect current state, specs, tasks, AGENTS health, and managed memory with spm before and after meaningful work.
---

# SPM Self Hosting

Use this skill when the repo you are editing is the Spec Embryo tool itself.

## Goal

Make the project recursive and self-hosting:

- inspect project memory with `spm`
- keep managed memory in `docs/spm/`
- update specs, tasks, and current state as part of real work
- use deterministic CLI flows before falling back to ad hoc inspection

## Default workflow

At the start of meaningful work, prefer this sequence:

```bash
bun run spm status
bun run spm spec list
bun run spm task list
```

Use these additional commands when relevant:

```bash
bun run spm agents check
bun run spm spec import-prompt --source <folder> --instructions "..."
bun run spm reshape --dry-run
```

## Rules

- Use `spm` when it already provides the needed project-memory view.
- Read raw files directly only when the CLI does not yet expose the needed operation.
- If work changes the actual project plan, update managed files in `docs/spm/`.
- If the docs-home layout drifts, use `spm reshape` or at least check its plan.
- Keep the skill concise; do not duplicate the whole root AGENTS policy here.

## When to update managed memory

Update `docs/spm/current.md` and relevant spec/task docs when:

- project focus changed
- a new feature slice or workflow was defined
- task status or dependencies changed
- the repo became more self-hosting or agent-aware

If a change is a clear checkpoint for another future agent, add or update a handoff too.
