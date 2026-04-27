# Spec Embryo Migration Guide

This guide explains how to adopt Spec Embryo into **spec-pm** without confusing the adoption scaffold for the repository's real product roadmap.

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

## Reading Doctor Efficiently

- Use `spm doctor` first for a cheap status, findings, versions, config, and counts check.
- Use `spm doctor --verbose` only when you need the long adoption guide, next-command context, or the full direct agent brief in the terminal output.
- Use `spm doctor --json` when an agent needs structured findings and guidance instead of scraping human-readable text.

## Default Workflow Loop

1. Start with `spm status` for a cheap state, version, and findings summary.
2. Read `docs/spm/current.md` for the repo's explicit checkpoint before broad implementation work.
3. If context is broad, stale, or cross-cutting, use `spm memory pack` before diving into code.
4. If you are resuming context-heavy work, inspect temporary scoped notes with `spm memory note list` instead of assuming they are already reflected in current state.
5. Use `spm memory consolidate` to promote durable truth instead of treating session notes as canonical project memory.

## Canonical Statuses

- Spec statuses: `proposed`, `active`, `paused`, `done`, `archived`
- Task statuses: `todo`, `in_progress`, `blocked`, `review`, `done`, `cancelled`
- Do not replace these with synonyms like `planned` or `completed` inside managed SpM docs.

## Tag Guidance For Retrieval

- Treat tags as retrieval handles for `spm memory query` and `spm memory brief`, not as decorative metadata.
- Preserve meaningful legacy topical labels as tags when they help another human or agent find related work later.
- Prefer short, stable tags like `combat`, `adoption`, or `ui` over sentence-like labels.
- Remember that memory tag filters normalize spaces, underscores, and hyphens to one canonical tag value.
- Do not expect partial substring matches from tag filters; use the actual tag you want to retrieve.
- Avoid unnecessary synonym drift when a repo already has a clear topical label; reuse the existing tag instead of inventing a near-duplicate.
- Do not use tags as a replacement for canonical statuses, links, or dependencies.

## Current Memory Workflow

- Use `spm memory note create` for fast session capture instead of hand-editing `.specpm/memory/...` note files.
- Use `spm memory note update`, `archive`, `restore`, and `list` for deterministic scoped note lifecycle management.
- Use `spm memory scopes` before assuming that the `session` or `org` scope exists or is writable in this repo.
- Use `spm memory consolidate` to promote a session note into durable repo memory; do not treat session notes as canonical project truth.

## Memory Workflow Commands

- `spm memory note create --scope session --title "..."` — Capture temporary session context through the CLI instead of hand-editing scoped note files.
- `spm memory note list --scope session` — Inspect temporary session notes explicitly when resuming context-heavy work.
- `spm memory scopes` — Confirm which memory scopes exist in this repo and whether they are writable before assuming a note workflow.
- `spm memory consolidate <NOTE-ID>` — Promote a session note into durable repo memory instead of treating session notes as canonical truth.

## Direct Agent Commands

- If you need the current repo workflow without the full adoption guide, run `spm agent brief` for a shorter steady-state surface.
- Use `spm agent brief --json` when wrapper tooling needs that workflow surface without scraping human-readable output.
- If you only need the bounded external `AGENTS.md` guidance, run `spm agent snippet` for a narrow read-only surface.
- Use `spm agent snippet --json` when wrapper tooling needs the snippet without scraping larger adoption outputs.

## Optional External AGENTS.md Snippet

- Optional additive snippet for host-repo `AGENTS.md` files. Keep the repo's own product and coding rules primary; only add this if it fills a real SpM workflow gap.

```md
## Optional SpM workflow
- Before multi-step or resume-heavy work, run `spm status`.
- Read `docs/spm/current.md` before broad implementation work so you start from the repo's explicit checkpoint.
- Use `spm memory pack` only when context is broad, stale, or cross-cutting.
- Treat session notes as temporary until promoted with `spm memory consolidate`.
```

## Nexus Coexistence

- Nexus is optional and external to Spec Embryo; install and upgrade it separately using the upstream project instructions.
- Use `spm` as the source of truth for specs, tasks, current state, handoffs, adoption structure, and deterministic workflow.
- Use Nexus for code impact, related-code, and blast-radius analysis only.
- Do not let Nexus replace or overwrite root `AGENTS.md`; keep any Nexus-specific guidance additive or scoped below the root.
- Use `spm nexus setup` to preview bounded Nexus changes, then ask the human before running `spm nexus setup --apply`.
- After enabling Nexus in `.specpm/config.toml`, re-run `spm doctor` so the bounded coexistence checks can confirm the setup.

## Nexus Setup Flow

1. Install Nexus separately from Spec Embryo by following the upstream Nexus instructions for your environment.
2. Run `spm nexus setup` to show the repo-local config, AGENTS, ignore-rule, and adoption-artifact changes before writing anything.
3. Ask the human whether to enable bounded Nexus coexistence for this repo.
4. If approved, run `spm nexus setup --apply` instead of editing `.specpm/config.toml` and `AGENTS.md` by hand.
5. Run `spm doctor` after apply, then run the recommended GitNexus indexing command if the external tool is installed.

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

## Adopting Newer SpM Guidance

1. If `spm doctor` says the running CLI is newer than the repo's recorded `tool_version`, update the installed package first if needed.
2. Refresh your SpM usage policy from the current `spm doctor --verbose` or `spm doctor --json` output before continuing work, because repo-local guidance may lag the installed CLI.
3. Re-run `spm init` to refresh deterministic adoption artifacts, missing defaults, and the repo's recorded tool version.
4. After the refresh, continue with the same SpM workflow loop described above instead of switching to a separate upgrade-only workflow.
5. Within that same loop, prefer the current scoped-memory workflow (`spm memory note ...`, `spm memory scopes`, and `spm memory consolidate`) instead of raw scoped note-file edits.
6. Run `spm doctor` again to confirm the repo under the newer guidance before continuing migration work.
7. If legacy docs are still the source of truth, regenerate the import brief so the current agent sees the newer migration guidance.

## First-Week Sequence

1. Run doctor and review its findings before assuming the repo is ready for normal work.
2. Inventory the repository's actual product direction and existing planning docs before treating the scaffold as real roadmap work.
3. Import or create the first real specs so the managed memory reflects product intent instead of only onboarding scaffolding.
4. Create linked tasks and rewrite current state around real project work.
5. Write an initial handoff once the adoption choices and first actions are explicit.
