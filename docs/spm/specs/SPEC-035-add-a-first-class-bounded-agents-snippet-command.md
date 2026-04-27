+++
doc_kind = "spec"
id = "SPEC-035"
title = "Add a first-class bounded AGENTS snippet command"
summary = "Expose the external-repo SpM AGENTS snippet directly so humans and agents can retrieve it without scraping larger adoption outputs."
status = "active"
task_ids = ["TASK-091"]
tags = ["adoption", "agents", "external-repos"]
updated_at = "2026-04-27T01:42:23.424Z"
+++

# Problem

SpM now teaches a bounded external `AGENTS.md` snippet through `doctor --verbose`, `init`, generated migration artifacts, and `spm agent brief`, but there is still no narrow command that returns just that snippet. Humans and wrapper agents that want only the additive `AGENTS.md` guidance still have to scrape it out of larger outputs that also contain unrelated workflow, migration, and capability-refresh context.

# Goals

- Expose the bounded external `AGENTS.md` snippet through a first-class direct command.
- Keep the command read-only and deterministic, with both human-readable and JSON output.
- Reuse the existing shared adoption-guidance snippet instead of creating a parallel command-only wording path.
- Keep the direct command useful for both healthy repos and repos whose current-state checkpoint is missing or unreadable.

# Non-Goals

- Do not auto-edit host-repo `AGENTS.md` files from this command.
- Do not replace the broader `spm agent brief`, `spm doctor --verbose`, or migration-guide outputs.
- Do not create a second snippet format that diverges from the shared adoption guidance contract.

# Constraints

- The command should fit naturally under the existing `spm agent` surface.
- JSON output should expose the same snippet structure other deterministic surfaces already use.
- The command should stay thin in `src/commands/` and delegate snippet assembly/rendering to reusable services.

# Proposed Approach

Add a direct `spm agent snippet` subcommand that loads the same doctor/adoption report used by `spm agent brief`, then extracts and renders only the bounded external snippet.

The implementation should:

1. Extend the agent command router to accept `snippet` alongside the existing default `brief` flow.
2. Add a reusable snippet builder/renderer in the agent-workflow service so human and JSON outputs stay aligned with the shared adoption-guidance structure.
3. Update help text, docs, and tests so the direct snippet surface is discoverable and treated as a narrow additive retrieval flow rather than a second adoption system.

# Acceptance Criteria

- `spm agent snippet` returns the bounded external `AGENTS.md` snippet in human-readable form.
- `spm agent snippet --json` returns a stable structured snippet payload.
- The direct snippet stays aligned with the shared adoption-guidance snippet for normal, missing-current-state, and unreadable-current-state cases.
- The repo-local docs and managed current state reflect the new direct snippet command.
