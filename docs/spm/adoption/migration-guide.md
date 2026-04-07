# Spec Embryo Migration Guide

This guide explains how to adopt Spec Embryo into **spec-embryo** without confusing the adoption scaffold for the repository's real product roadmap.

## What SpM Is

- spm is Spec Embryo's local-first CLI for project memory. It reads and writes the repo's managed specs, tasks, handoffs, and current state so humans and agents share the same file-backed source of truth.
- Use spm to keep planning state deterministic, repo-native, and visible to both the human and the next agent instead of reconstructing that state from scattered docs or chat history.

## Current Adoption State

- Adoption state: `adopted`
- Managed memory home: `docs/spm`
- Direct agent brief file: `docs/spm/adoption/direct-agent-brief.md`

## Scaffold Versus Real Project Work

- Any seed spec/task scaffold is temporary migration backlog, not the repository's literal product roadmap.
- The real product direction still lives in this repository's own specs, docs, architecture notes, and active codebase.
- Use the scaffold to migrate or rewrite real project memory into the managed SpM layout instead of replacing the scaffold too early or implementing Spec Embryo itself inside the adopted repo.

## Source Material To Inspect First

- Inspect `docs` as likely source material for the real project direction and migration work.

## What SpM Already Handles Deterministically

- Repo adoption inspection, layout classification, and doctor findings.
- Reading and writing managed current state, specs, tasks, and handoffs.
- Validating frontmatter, links, statuses, and configured managed-memory paths.
- Computing deterministic status, blockers, dependency-derived next actions, and timeline/kanban projections.
- Rendering the built-in UI and surfacing the repo memory that UI reads from local files.

## User-Mediated Agent Handoff

1. Run the relevant `spm` command such as `spm init`, `spm doctor`, or `spm spec import-prompt`.
2. Review this migration guide so the adoption choices are explicit.
3. Copy the direct agent brief from the command output or from the generated brief file.
4. Paste that brief directly to the active coding agent so it works from the reviewed adoption contract instead of guessing from scaffold docs alone.
5. Ask the agent to update managed specs, tasks, current state, AGENTS files, and skills as adoption progresses.

## Recommended Next Commands

- `spm doctor` — Verify the adopted layout before trusting normal resume and UI flows.
- `spm current set --focus "..." --summary "..."` — Create the first explicit checkpoint so another human or agent can answer where work should continue.
- `spm handoff --title "Initial adoption checkpoint"` — Capture the migration state once the first meaningful setup pass is complete.

## First-Week Sequence

1. Run doctor and review its findings before assuming the repo is ready for normal work.
2. Inventory the repository's actual product direction and existing planning docs before treating the scaffold as real roadmap work.
3. Import or create the first real specs so the managed memory reflects product intent instead of only onboarding scaffolding.
4. Create linked tasks and rewrite current state around real project work.
5. Write an initial handoff once the adoption choices and first actions are explicit.
