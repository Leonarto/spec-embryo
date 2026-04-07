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
- Use the scaffold to migrate existing documentation into managed specs, tasks, current state, and AGENTS guidance.
- Keep statuses, dependencies, and current focus trustworthy so `spm ui` reflects real progress and blockers.
- Update AGENTS files and local skills when adoption changes how future agents should work in this repo.

Deterministic commands to prefer:
- spm doctor
- spm current set --focus "..." --summary "..."
- spm handoff --title "Initial adoption checkpoint"

Do not assume:
- Do not replace or delete legacy project docs before preserving their intent in managed memory.
- Do not treat the seed scaffold as the repo's long-term roadmap once real project memory exists.
- Do not assume adoption is complete just because `.specpm/` or `docs/spm/` already exists.

Ask the human when:
- more than one source docs/spec area could be the real migration source
- migration would rewrite or discard meaningful existing project planning
- the repo needs a structural choice that could affect how the team works going forward
