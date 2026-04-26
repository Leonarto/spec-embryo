+++
doc_kind = "spec"
id = "SPEC-021"
title = "Teach upgraded agents to refresh SpM capabilities and usage policies"
summary = "Make doctor/init/adoption guidance explicitly tell agents when a newer SpM version changes available workflows, especially scoped memory management, so they refresh behavior instead of using stale assumptions."
status = "active"
task_ids = ["TASK-075"]
tags = ["adoption", "doctor", "memory", "agent-guidance"]
owner = "human-ai"
updated_at = "2026-04-26T00:46:23.050Z"
+++

# Problem

Spec Embryo now has a broader scoped-memory workflow than older adopted repos were originally taught to use. The current `doctor` upgrade path tells agents that the CLI version changed and suggests re-running `spm init`, but it does not explicitly teach what usage policy or capabilities changed under the newer CLI.

That leaves a risky gap for upgraded repos:

- an agent may keep using stale assumptions from an older repo-local brief or AGENTS guidance
- new memory-note lifecycle commands may go unused even when they are the preferred workflow
- agents may keep hand-editing `.specpm/memory/...` files because the upgrade flow never tells them to stop
- a JSON-consuming agent can detect version drift, but it cannot easily distinguish "refresh repo-local guidance" from "refresh your actual working policy"

Because Spec Embryo is a tool extension for Codex and Claude rather than a replacement assistant, version-aware capability refresh needs to be explicit and deterministic. Agents should know when the installed CLI is newer than the repo's recorded version, which workflows they should now prefer, and whether they should refresh repo-local adoption artifacts before continuing work.

# Goals

- Teach upgraded agents that a newer installed `spm` version can change available workflows and usage policy, not just defaults or file scaffolding.
- Surface the current scoped-memory workflow clearly in doctor/adoption guidance, especially `spm memory note`, `spm memory scopes`, and `spm memory consolidate`.
- Add a structured capability-refresh contract that both human-readable and JSON agent flows can consume without scraping incidental prose.
- Keep upgrade guidance deterministic and repo-local rather than requiring ad hoc release-note lookup.
- Preserve backward compatibility for older repos whose config does not yet spell out the newer memory-scope defaults.

# Non-Goals

- Do not add remote release-note fetching or network-dependent version introspection.
- Do not invent a hidden feature registry or dynamic plugin system for capabilities in this slice.
- Do not change the underlying scoped-memory semantics; this slice is about guidance and adoption behavior.
- Do not require a config rewrite for older repos that already parse correctly under the default memory-scope fallbacks.

# Constraints

- `doctor` must remain concise by default; the richer capability refresh can live in verbose and JSON surfaces.
- The same guidance source should feed `doctor --verbose`, `doctor --json`, `init` adoption artifacts, and the direct agent brief.
- Capability guidance should describe preferred workflows, not restate all CLI help text.
- The upgrade-sensitive memory workflow must be explicit enough that an agent can stop editing scoped note files by hand after reading the guidance.

# Proposed Approach

Extend adoption guidance so it includes two related layers:

1. Current capability guidance
   - always describe the preferred scoped-memory workflow in a compact, agent-oriented way
   - explain when to use `memory note`, `memory scopes`, and `memory consolidate`
2. Version-aware capability refresh
   - when `doctor` detects that the running CLI is newer than the repo's recorded `tool_version`, explicitly tell the agent that repo-local usage guidance may be stale
   - instruct the agent to refresh its SpM usage policy from the current doctor output, re-run `spm init` if appropriate, and then continue under the newer workflow

The contract should be structured in `buildAdoptionGuidance` so every downstream renderer stays aligned.

# Detailed Specification

## Structured guidance model

Adoption guidance should gain an explicit capability-refresh section with enough structure that JSON-consuming agents can reason about it directly. The model should differentiate:

- current preferred workflows that apply regardless of version drift
- upgrade-only refresh actions that apply when the CLI is newer than the repo's recorded version

At a minimum, the guidance should capture:

- whether a capability refresh is required
- why it is required
- which memory workflow changes an agent should adopt
- which deterministic commands should be run next to refresh repo-local artifacts or confirm the updated state

## Memory workflow guidance

The current guidance should teach these behaviors clearly:

- use `spm memory note create` for fast session capture instead of hand-authoring scoped note files
- use `spm memory note update`, `archive`, `restore`, and `list` for note lifecycle management
- use `spm memory scopes` before assuming a scope exists or is writable
- use `spm memory consolidate` to promote session notes into durable repo memory rather than treating session notes as canonical truth

This guidance should appear in the migration guide and direct agent brief, and it should also be available in the JSON doctor payload.

## Upgrade-detection behavior

When `doctor` detects a newer CLI than the repo's recorded version:

- the upgrade finding hint should explicitly say that newer workflows or usage policies may exist
- the direct agent brief should tell the agent to refresh its SpM usage policy from the current doctor output before continuing work
- the refresh guidance should call out the current memory workflow as an example of capability drift the repo-local artifacts may not yet describe
- recommended follow-up commands should still include `spm init` and `spm doctor`, but the reason should mention refreshing agent-facing guidance as well as defaults

## Rendering behavior

- `doctor --verbose` should visibly include the capability guidance and the upgrade-only refresh guidance when applicable
- `doctor --json` should expose the same information as structured data
- `init` adoption artifacts should inherit the updated current capability guidance so newly refreshed brief files match what `doctor` teaches
- the default concise `doctor` output can stay small, but when an upgrade is detected it should at least point the user toward the richer capability-refresh surfaces

# Edge Cases

- A repo may already be on the current `tool_version`; current memory workflow guidance should still be visible without falsely implying a version mismatch.
- A repo may have stale direct-agent-brief files on disk while the running `doctor` output is current; the upgrade guidance should make that distinction clear.
- A repo may not use scoped memory heavily yet; the guidance should still teach the preferred workflow without forcing new note creation.
- A JSON-consuming agent may never read the human-formatted brief, so the structured doctor payload must be sufficient on its own.

# Acceptance Criteria

- `doctor` upgrade guidance explicitly tells agents that a newer CLI may require refreshing their SpM usage policy, not just rerunning setup commands.
- Adoption guidance and direct agent briefs teach the current scoped-memory workflow, including note lifecycle, scope inspection, and consolidation.
- The capability-refresh data is available through structured JSON as well as verbose human-readable output.
- Existing repos without explicit `memory_scopes` config continue to work without a required config migration.

# Open Questions

- Should a future slice expose a more formal per-version capability changelog, or is the curated "current workflow + refresh actions" guidance sufficient for now?
