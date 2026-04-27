You are helping adopt Spec Embryo into this repository.

Important context:
- spm is Spec Embryo's local-first CLI for project memory. It reads and writes the repo's managed specs, tasks, handoffs, and current state so humans and agents share the same file-backed source of truth.
- Use spm to keep planning state deterministic, repo-native, and visible to both the human and the next agent instead of reconstructing that state from scattered docs or chat history.
- This repository's product direction is not Spec Embryo unless the repo actually is Spec Embryo itself.
- Treat any SpM seed scaffold as migration backlog for organizing the repo, not as literal product implementation work.
- The managed memory home for this repo is `docs/spm`.

What to inspect first:
- Inspect `docs` as likely source material for the real project direction and migration work.

How to work:
- Use `spm` before ad hoc interpretation when it already exposes the needed state, structure, or migration guidance.
- Use `spm doctor` first for a cheap status, findings, versions, config, and counts check.
- Use `spm doctor --verbose` only when you need the long adoption guide, next-command context, or the full direct agent brief in the terminal output.
- Use `spm doctor --json` when an agent needs structured findings and guidance instead of scraping human-readable text.
- Loop 1: Start with `spm status` for a cheap state, version, and findings summary.
- Loop 2: Read `docs/spm/current.md` for the repo's explicit checkpoint before broad implementation work.
- Loop 3: If context is broad, stale, or cross-cutting, use `spm memory pack` before diving into code.
- Loop 4: If you are resuming context-heavy work, inspect temporary scoped notes with `spm memory note list` instead of assuming they are already reflected in current state.
- Loop 5: Use `spm memory consolidate` to promote durable truth instead of treating session notes as canonical project memory.
- Use `spm memory note create` for fast session capture instead of hand-editing `.specpm/memory/...` note files.
- Use `spm memory note update`, `archive`, `restore`, and `list` for deterministic scoped note lifecycle management.
- Use `spm memory scopes` before assuming that the `session` or `org` scope exists or is writable in this repo.
- Use `spm memory consolidate` to promote a session note into durable repo memory; do not treat session notes as canonical project truth.
- If you need to refresh host-repo `AGENTS.md`, reuse the bounded SpM snippet from the migration guide instead of inventing parallel wording.
- Use the scaffold to migrate existing documentation into managed specs, tasks, current state, and AGENTS guidance.
- Keep statuses, dependencies, and current focus trustworthy so `spm ui` reflects real progress and blockers.
- Update AGENTS files and local skills when adoption changes how future agents should work in this repo.
- Use only canonical spec statuses: proposed, active, paused, done, archived.
- Use only canonical task statuses: todo, in_progress, blocked, review, done, cancelled.
- Treat tags as retrieval handles for `spm memory query` and `spm memory brief`, not as decorative metadata.
- Preserve meaningful legacy topical labels as tags when they help another human or agent find related work later.
- Prefer short, stable tags like `combat`, `adoption`, or `ui` over sentence-like labels.
- Remember that memory tag filters normalize spaces, underscores, and hyphens to one canonical tag value.
- Do not expect partial substring matches from tag filters; use the actual tag you want to retrieve.
- Avoid unnecessary synonym drift when a repo already has a clear topical label; reuse the existing tag instead of inventing a near-duplicate.
- Do not use tags as a replacement for canonical statuses, links, or dependencies.
- Nexus is optional and external to Spec Embryo; install and upgrade it separately using the upstream project instructions.
- Use `spm` as the source of truth for specs, tasks, current state, handoffs, adoption structure, and deterministic workflow.
- Use Nexus for code impact, related-code, and blast-radius analysis only.
- Do not let Nexus replace or overwrite root `AGENTS.md`; keep any Nexus-specific guidance additive or scoped below the root.
- Use `spm nexus setup` to preview bounded Nexus changes, then ask the human before running `spm nexus setup --apply`.
- After enabling Nexus in `.specpm/config.toml`, re-run `spm doctor` so the bounded coexistence checks can confirm the setup.

Deterministic commands to prefer:
- spm doctor
- spm current set --focus "..." --summary "..."
- spm handoff --title "Initial adoption checkpoint"

If doctor reports that the running CLI is newer than the repo's recorded tool version:
- If `spm doctor` says the running CLI is newer than the repo's recorded `tool_version`, update the installed package first if needed.
- Refresh your SpM usage policy from the current `spm doctor --verbose` or `spm doctor --json` output before continuing work, because repo-local guidance may lag the installed CLI.
- Re-run `spm init` to refresh deterministic adoption artifacts, missing defaults, and the repo's recorded tool version.
- After the refresh, continue with the same SpM workflow loop described above instead of switching to a separate upgrade-only workflow.
- Within that same loop, prefer the current scoped-memory workflow (`spm memory note ...`, `spm memory scopes`, and `spm memory consolidate`) instead of raw scoped note-file edits.
- Run `spm doctor` again to confirm the repo under the newer guidance before continuing migration work.
- If legacy docs are still the source of truth, regenerate the import brief so the current agent sees the newer migration guidance.

Do not assume:
- Do not replace or delete legacy project docs before preserving their intent in managed memory.
- Do not treat the seed scaffold as the repo's long-term roadmap once real project memory exists.
- Do not assume adoption is complete just because `.specpm/` or `docs/spm/` already exists.

Ask the human when:
- more than one source docs/spec area could be the real migration source
- migration would rewrite or discard meaningful existing project planning
- the repo needs a structural choice that could affect how the team works going forward
