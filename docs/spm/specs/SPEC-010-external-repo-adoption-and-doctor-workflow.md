+++
doc_kind = "spec"
id = "SPEC-010"
title = "External repo adoption and doctor workflow"
summary = "Define how Spec Embryo should help existing repositories adopt the managed memory model, detect drift, and surface the next deterministic cleanup actions."
status = "done"
task_ids = ["TASK-030", "TASK-031", "TASK-032", "TASK-038", "TASK-039", "TASK-040", "TASK-041", "TASK-042", "TASK-043", "TASK-044"]
tags = ["adoption", "doctor", "workflow"]
updated_at = "2026-04-08T02:56:39.423Z"
+++

# Problem


Spec Embryo is already strong inside its own repo, but adopting it in another project still requires too much manual interpretation. A human or agent currently has to decide:

- whether the repo already has a usable docs home
- whether existing `docs/`, `specs/`, or task notes should be imported, reshaped, or left alone
- which minimum files must exist before the workflow is trustworthy
- what drifted away from the expected shape after adoption
- what the next cleanup action should be after initialization

That means the product is locally powerful but externally under-guided.

If another project wants to start using the Spec Embryo way today, the tool can help with `init`, `reshape`, and `spec import-prompt`, but it still does not provide one deterministic adoption workflow that answers:

- what did you find in this repo?
- what did you adopt versus create new?
- what is missing from the standard?
- what should be fixed next?
- is this repo ready for normal `spm` workflows yet?

This gap makes external adoption slower, more error-prone, and more dependent on an expert agent already knowing how Spec Embryo is supposed to spread through a repo.

## Overview


Define a first-class external adoption workflow for existing repositories and a deterministic doctor flow that validates repo-memory health after adoption. The goal is to make “bring Spec Embryo into this project” feel like a guided product path instead of a bag of low-level commands.

## Context


Spec Embryo already has the building blocks needed for this:

- `init` can create the managed memory home
- `reshape` can normalize layout drift
- `spec import-prompt` can scan legacy docs/specs folders and produce an agent-ready migration bundle
- `status` can derive current focus, changed items, blockers, and next actions
- AGENTS health checks already enforce instruction-budget hygiene
- the repo has a real self-hosted workflow that demonstrates the intended model

What is missing is a higher-level adoption layer that combines repo discovery, memory-home placement, migration guidance, doctor checks, and “what next?” output into one coherent experience for outside repos.

This matters because external adoption is the actual product growth path. If another repo cannot reliably get from zero or legacy docs to a healthy Spec Embryo state, then the internal polish does not translate into broader use.

# Goals


- Make it straightforward for an existing repository to adopt the Spec Embryo memory model.
- Detect whether a repo already has a suitable docs/specs surface and decide how Spec Embryo should attach to it.
- Surface a deterministic adoption report that explains:
  - what was found
  - what was created
  - what remains missing
  - what should happen next
- Add a doctor flow that checks repo-memory health and drift after adoption.
- Make the “first week in a repo” workflow clear for both humans and agents.
- Keep the source of truth file-backed and repo-native.

# Non-Goals


- Do not add a remote onboarding backend or hosted setup wizard.
- Do not try to fully auto-migrate arbitrary legacy docs into perfect specs/tasks without review.
- Do not require LLM calls for base adoption checks.
- Do not turn doctor output into an aggressive auto-fix engine in the first slice.
- Do not solve every future org-level or multi-repo rollout concern yet.

## Constraints


- Adoption should still work in repos with zero agent backend configured.
- Deterministic checks should be the default for repo discovery, required-files validation, and drift reporting.
- The workflow must preserve useful existing structure during inspection, but the default adoption target should still be the canonical Spec Embryo managed layout so the deterministic UI and CLI remain reliable.
- If a repo already has a meaningful documentation home, Spec Embryo should attach there before inventing new top-level clutter.
- Doctor output should be structured enough that an agent can act on it directly, but readable enough for a human maintainer.
- The first slice should keep path and layout flexibility limited and explicit in config; broader support for alternative structures should be future extensibility, not an ambiguous default.

## Proposed Approach


- Make `spm init` the primary adoption entrypoint for both fresh and existing repos.
- The guided `init` flow should:
  - inspect the repo for likely docs/specs homes
  - detect whether Spec Embryo artifacts already exist
  - classify the repo into a small set of deterministic states such as:
    - clean/new to Spec Embryo
    - partially adopted
    - drifted from standard
    - legacy docs present and likely importable
  - choose or confirm the managed memory home
  - seed or preserve the right files
  - converge toward the canonical Spec Embryo structure unless config already defines an accepted alternative
  - emit an adoption summary and next-step checklist
- Introduce `spm doctor` as a deterministic validation command that checks:
  - config presence and path consistency
  - current state file presence
  - managed specs/tasks folder presence
  - required AGENTS guidance files where relevant
  - broken links between specs and tasks
  - malformed or missing document fields
  - stale or missing current-state basics
  - memory-home drift relative to config
- `doctor` should remain read-only in the first slice and should not silently rewrite repo structure.
- `doctor` should return both:
  - human-readable status output
  - structured machine-readable output for agent continuation
- `doctor` should guide the human or active agent toward the next migration step, including when to ask whether the repo should be migrated further toward Spec Embryo structure.
- The adoption workflow should naturally connect to existing commands rather than replace them:
  - `spec import-prompt` for legacy docs
  - `reshape` for layout normalization
- `current set` for first explicit checkpoint
- `spec create` / `task create` for starting execution after adoption

## Detailed Specification


- The adoption flow should begin with deterministic repo inspection before writing files.
- `init` should be able to act as an adoption-oriented command, not only as a blank-project seeder.
- If multiple plausible docs homes exist, the tool should not silently choose one without confirmation or an explicit non-interactive flag.
- If no suitable docs home exists, the tool should create the configured fallback memory home in a namespaced way.
- The adoption summary should explicitly list:
  - detected docs homes
  - selected managed memory home
  - files created
  - files preserved
  - files or directories that still need migration work
  - recommended next commands
- If `init` seeds onboarding scaffold docs, those docs should explicitly describe themselves as temporary adoption guidance for the adopted repo, not as the repo's literal product roadmap.
- If a repo already has managed spec/task docs, rerunning `init` should preserve them rather than reseeding additional onboarding scaffold.
- If a repo already has managed spec/task docs but is missing `current.md`, `init` should create a neutral current-state template instead of adoption-flavored scaffold that points at fake tasks.
- `doctor` should classify findings by severity or actionability, such as:
  - blocking
  - warning
  - informational
- `doctor` should be able to explain both missing structure and structural drift.
- `doctor` findings should explicitly distinguish:
  - already healthy areas
  - gaps that prevent reliable SpM workflows
  - migration opportunities that are optional but recommended
- A repo that already has Spec Embryo config but has missing or inconsistent managed-memory files should be treated as drifted, not as a fresh repo.
- A repo with legacy docs/specs but no Spec Embryo config should receive migration guidance rather than only a “missing files” error.
- The structured doctor output should make it easy for an agent to turn findings into:
  - follow-up tasks
  - reshape commands
  - import prompts
  - current-state updates
- The structured doctor output should also make it easy for an active agent to ask the human whether to proceed with migration instead of assuming permission.
- Human-readable and JSON adoption/doctor output should include explicit agent orientation that says Spec Embryo is workflow support for the adopted repo, not the adopted repo's product direction.
- Adoption guidance should explicitly explain what `spm` is, when another LLM should use it, and which deterministic responsibilities it can offload to `spm` instead of improvising them in chat.
- Adoption should provide a repo-local migration guide plus a direct agent brief that the human can review and then paste to the active coding agent.
- The direct agent brief should be designed for a user-mediated loop:
  - the user runs an `spm` command
  - `spm` emits a migration guide and intelligent agent brief
  - the user reviews that brief
  - the user pastes it to the active coding agent
- The migration guide and brief should explain:
  - what the scaffold tasks are for
  - where the real source specs/docs live
  - why `spm` is present in the repo
  - which deterministic chores `spm` handles
  - how AGENTS files and skills should be updated as adoption progresses
- The migration guide and brief should explicitly cover partially adopted repos, including how to identify missing adoption work in:
  - managed spec/task conversion
  - statuses and dependencies
  - AGENTS sizing and `spm` usage guidance
  - repo-local skills
  - `spm ui` visibility/readiness
- `doctor` should warn when the managed memory still contains onboarding scaffold so another agent does not treat those docs as literal implementation backlog.
- Adoption output should include a deterministic “first week” sequence tailored to repo state, such as:
  - import legacy specs
  - create initial current state
  - define first active spec
  - define first linked tasks
  - write first handoff
- The first slice should assume the canonical managed layout for rendering and normal workflows, while allowing future configuration work to broaden supported folder arrangements.

## Edge Cases


- A repo may have both `docs/` and `specs/` with different purposes.
- A repo may already contain files named similarly to Spec Embryo artifacts but with incompatible semantics.
- A repo may have partial managed memory, such as config present but no `current.md`.
- A repo may have managed specs/tasks but broken backlinks between them.
- A repo may already have agent guidance files that should be augmented rather than overwritten.
- A repo may want non-interactive adoption in CI or scripted setups.
- A repo may be healthy enough for normal work even if some optional AGENTS or UI-oriented files are absent.
- A repo may want a future alternative structure such as themed spec folders or per-spec task folders, but that flexibility should not break the canonical defaults in the first slice.

## Acceptance Criteria


- An existing repo can run a single adoption-oriented flow and receive a deterministic summary of what Spec Embryo found and what it did.
- `spm init` is the primary entrypoint for that adoption-oriented flow.
- The product can distinguish between fresh repos, partially adopted repos, drifted repos, and repos with importable legacy docs.
- `doctor` can report missing, inconsistent, or drifted project-memory structure without using an LLM.
- `doctor` can emit output useful to both a human maintainer and an already-running agent.
- `doctor` remains read-only in v1 while still making the next migration decision obvious.
- The adoption path produces a clear next-step sequence instead of leaving the repo half-initialized without guidance.
- A freshly adopted repo gets seed docs that guide the first migration steps without steering another agent toward building Spec Embryo inside the adopted project.
- Rerunning `init` on an already adopted repo does not create extra onboarding specs/tasks on top of real managed memory.
- The adoption path defaults toward the canonical Spec Embryo layout, while leaving room for future config-driven structure flexibility.
- The external adoption workflow composes cleanly with `reshape`, `spec import-prompt`, and existing spec/task/current-state flows.

## Resolved Decisions

- Question: Should the primary entrypoint be a new explicit `spm adopt` command, or should this be a guided mode under `spm init` first?
  Answer:
    the init should handle all of it.

- Question: Should `doctor` remain purely read-only in v1, or should it also emit explicit fix commands and patch suggestions alongside findings?
  Answer:
    sounds good as readonly guiding the LLM to ask the user if he wants to proceed with a migration to spm

- Question: For partially adopted repos, should adoption prioritize preserving legacy structure in place, or reshaping more aggressively toward the preferred managed layout?
  Answer:
    it should always try to set spm structure but, if not the deterministic UI wont render properly, we should though improve the "possible structures” that could be set in the config file, like file paths and some rules from folder separation, in which the UI could read, so there could be in the future some leeway in how the folders are done. For example, some people might prefer to separate tasks per folder if they belong to a spec, or some people might want to group specs into a folder if the are of a same theme.
