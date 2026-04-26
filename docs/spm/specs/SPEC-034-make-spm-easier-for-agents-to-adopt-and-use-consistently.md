+++
doc_kind = "spec"
id = "SPEC-034"
title = "Make SpM easier for agents to adopt and use consistently"
summary = "Define a tighter adoption and resume story so upgraded and newly-adopted agents reliably use SpM's current context workflows instead of treating them as optional."
status = "active"
task_ids = ["TASK-088", "TASK-089", "TASK-090"]
tags = ["adoption", "doctor", "agent-guidance", "context"]
updated_at = "2026-04-26T23:38:04.187Z"
+++

# Overview

SpM already has strong deterministic memory, adoption, and context-pack features, but the adoption story is still spread across too many places for an upgraded or newly-adopted agent to internalize quickly. `doctor`, `init`, `current.md`, adoption artifacts, AGENTS guidance, and memory commands all point in the right direction, but they do not yet collapse into one short operational habit that an agent can follow without guesswork.

This spec defines a first-class adoption layer that makes SpM easier to notice, easier to trust, and harder to ignore during resume-heavy or upgrade-sensitive work.

# Context

The recent `0.2.0` work materially improved SpM's memory and context capabilities:

- scoped memory notes and consolidation
- deterministic context packs and prompt-return bundles
- typed `nextInspect` expansion trails
- stronger doctor/init upgrade guidance

Those capabilities are real, but an external-project agent can still miss them in practice:

- the agent may treat `spm doctor` as a health check only instead of a workflow refresher
- the agent may rely on stale repo-local guidance after an SpM upgrade
- the agent may read `docs/spm/current.md` but skip `spm memory pack` and note management
- the agent may know the commands exist, but not which small loop should be preferred during everyday work

Adoption improves most when the product teaches one repeatable habit instead of several disconnected ones.

# Problem

SpM does not yet have a single short, first-class "how to use SpM in this repo today" surface for agents. Because of that:

- upgraded agents can continue using older habits even after `doctor` reports newer capabilities
- repo-local AGENTS files may mention SpM, but still leave too much ambiguity around the preferred resume workflow
- the best context features, especially `spm memory pack`, can remain underused because they are taught as capabilities rather than as part of one default loop
- external adoption depends too much on scattered prose across migration guides, direct-agent briefs, and user coaching

# Goals

- Give agents one short deterministic workflow that explains how to use SpM in the current repo, especially for resume-heavy and upgrade-aware work.
- Make upgrade guidance and steady-state usage guidance converge on the same operational loop instead of feeling like separate systems.
- Promote `spm memory pack` and scoped memory commands as part of normal agent behavior where they add value, not as optional trivia.
- Provide a bounded AGENTS snippet for adopted repos so Claude/Codex style agents are nudged toward the right SpM surfaces before long or resumed work.
- Keep the adoption contract deterministic, local-first, and compatible with SpM's existing doctor/init/adoption artifact architecture.

# Non-Goals

- Do not replace `spm doctor`, `spm init`, `spm resume`, or `spm memory pack` with opaque automation.
- Do not make SpM responsible for model-native summarization, reasoning, or hidden context management that Claude/Codex already do well.
- Do not bloat root or nested `AGENTS.md` files with long tutorials.
- Do not require external repos to enable Nexus, scoped memory capture, or prompt-return mode just to follow the base adoption loop.
- Do not introduce network-dependent release note fetching or remote policy lookup.

# Constraints

- The default adoption story should fit into a short agent-facing brief and a short AGENTS snippet.
- The same source-of-truth guidance should feed any new command, `doctor`, `init` artifacts, and generated AGENTS snippets where possible.
- The guidance must clearly distinguish "always do this on resume-heavy work" from "only do this when version drift or adoption drift is detected."
- New guidance should amplify existing commands rather than multiplying parallel ways to do the same thing.

# Proposed Approach

Introduce a small adoption layer with three coordinated pieces:

1. A first-class agent workflow brief command.
   - Add a short deterministic command that tells an agent how to use SpM in this repo today.
   - The brief should cover the default resume loop, when to inspect memory notes, when to use `spm memory pack`, and how version drift changes the guidance.
2. One operational loop shared across doctor/init/adoption artifacts.
   - Teach one compact loop such as: `spm status` -> read `docs/spm/current.md` -> use `spm memory pack` when context is broad or stale -> continue work -> consolidate temporary notes when needed.
   - When upgrade drift exists, prepend the refresh step instead of teaching a different workflow entirely.
3. A bounded external-repo AGENTS snippet.
   - Generate or recommend a short SpM usage snippet that external repos can adopt without surrendering their whole AGENTS strategy.

The product goal is not "more guidance everywhere." The product goal is "the same good guidance repeated consistently through the places agents already look."

# Detailed Specification

## First-class agent workflow brief

SpM should expose a first-class surface for an agent-facing usage brief. The command name can be finalized during implementation, but this slice assumes a dedicated surface such as `spm agent ...` or `spm help agent`.

That brief should answer four questions deterministically:

- what to read first
- what command to run next when context is broad or stale
- what to do differently when the installed CLI is newer than the repo's recorded version
- which scoped-memory commands are preferred instead of raw file editing

The brief should be available in both human-readable and JSON forms so users, Codex, Claude, and wrapper tools can all consume the same contract.

## Shared operational loop

The steady-state loop should be taught compactly and consistently. At minimum it should encode:

1. Start with `spm status` for a cheap state, version, and findings summary.
2. Read `docs/spm/current.md` for the repo's explicit checkpoint.
3. When context is broad, stale, or cross-cutting, use `spm memory pack` before diving into code.
4. Use scoped note commands for temporary working memory instead of editing note files directly.
5. Promote durable truth with `spm memory consolidate` instead of treating session notes as canonical.

This loop should become the default explanation used by doctor/init/adoption artifacts instead of each surface improvising its own wording.

## Upgrade-aware refresh behavior

When the installed CLI is newer than the repo's recorded `tool_version`, the agent-facing guidance should explicitly say:

- your repo-local SpM usage policy may be stale
- refresh from the current agent workflow brief or doctor guidance
- re-run `spm init` if deterministic repo-local artifacts should be refreshed
- then continue under the same operational loop, not a separate upgrade-only workflow

This keeps upgrade handling additive instead of bifurcating adoption into "normal mode" and "upgrade mode."

## AGENTS snippet strategy

SpM should ship or generate a short snippet suitable for external repo `AGENTS.md` files. The snippet should:

- stay bounded enough for AGENTS budgets
- point to `spm status` and `docs/spm/current.md` as the entrypoint
- mention `spm memory pack` only when broad or stale context justifies it
- mention `spm memory note list` or equivalent note inspection only for resume-heavy work, not every tiny fix
- avoid prescribing Nexus as a default requirement

The snippet should reinforce SpM's role without trying to dominate the host repo's entire instruction layer.

## Rendering and compatibility

- The new brief should be built from shared deterministic guidance data so `doctor`, `init`, and adoption artifacts stay aligned.
- Existing `doctor --verbose` and `doctor --json` surfaces should continue to work, but they should point clearly to the more direct workflow brief.
- Existing adopted repos should remain backward compatible; this slice changes guidance and orchestration, not the underlying storage model.

# Edge Cases

- Some repos will have very small tasks where `spm status` plus `current.md` are enough; the guidance should not oversell `memory pack` for every tiny fix.
- Some repos will not use scoped session notes heavily; the workflow should still teach note commands without making them mandatory on every run.
- Some agents will only consume JSON, so the operational loop must be structured and not only embedded in prose.
- Some external repos will already have dense AGENTS files; the SpM snippet must remain optional, bounded, and easy to merge.
- Some wrappers may prefer `spm resume --backend prompt`; this slice should not demote prompt-return mode, only teach when the lighter workflow brief is the better entrypoint.

# Acceptance Criteria

- A new or newly-refreshed agent can learn the preferred SpM usage loop from one short first-class SpM surface instead of stitching it together from multiple docs.
- Upgrade-aware guidance tells agents to refresh behavior and continue with the same operational loop, rather than leaving them on stale habits.
- `spm memory pack` appears in the adoption story as the recommended broad-context escalation path, not as an obscure side feature.
- External repos have a short bounded AGENTS snippet available for SpM usage guidance.
- The guidance remains deterministic, local-first, and backward compatible with already-adopted repos.

# Open Questions

- Should the first-class surface be a new top-level `spm agent` command, or should it live under an existing command family such as `doctor`?
- Should the AGENTS snippet be generated automatically, or should SpM only render it for humans/agents to paste deliberately?
- Should the workflow brief mention `spm resume --backend prompt` directly, or keep that as an advanced branch once the base loop is learned?
