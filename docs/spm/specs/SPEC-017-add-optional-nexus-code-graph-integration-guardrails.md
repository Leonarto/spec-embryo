+++
doc_kind = "spec"
id = "SPEC-017"
title = "Add optional Nexus code-graph integration guardrails"
summary = "Let Spec Embryo guide, validate, and constrain an external Nexus installation so code-graph analysis complements repo memory without taking over AGENTS or becoming a hard dependency."
status = "done"
task_ids = ["TASK-061", "TASK-062", "TASK-063", "TASK-064"]
tags = ["adoption", "agents", "analysis", "nexus"]
updated_at = "2026-04-11T03:16:28.635Z"
+++

# Problem

Spec Embryo already gives humans and agents a deterministic project-memory layer over specs, tasks, current state, handoffs, and repo-native planning workflows. What it does not currently provide is code-symbol or code-impact analysis beyond the repo structures it already owns.

That makes external graph tools attractive, especially for questions such as:

- which files or symbols are likely affected by this change
- which code areas are related to a task or spec
- what blast radius should a reviewer inspect

The risk is that a code-graph tool can easily overreach if it is treated as the new source of truth for repo planning or if it is allowed to rewrite root `AGENTS.md` and broader repo conventions in its own image.

For Spec Embryo, the right relationship is asymmetric:

- `spm` remains the source of truth for project memory and deterministic workflow
- Nexus stays an optional external code-analysis complement
- adoption and doctor flows should teach and enforce that boundary explicitly

Without that contract, another repo can enable Nexus in a way that confuses humans and agents about:

- whether `spm` or Nexus owns planning guidance
- whether Nexus is required for normal `spm` operation
- how AGENTS files should be shared without ballooning the root instructions
- how to install and use Nexus without embedding or vendoring it into Spec Embryo itself

# Goals

- Add an explicit optional Nexus configuration surface to `.specpm/config.toml`.
- Keep Nexus external to Spec Embryo rather than bundling it as a package dependency.
- Teach adoption and init flows how to install, configure, and use Nexus safely.
- Make `spm doctor` validate the Nexus coexistence contract when Nexus is enabled.
- Make AGENTS guidance explain the split of responsibilities between `spm` and Nexus.
- Preserve normal `spm` behavior when Nexus is disabled or absent.

# Non-Goals

- Do not execute Nexus commands from core `spm` flows in this slice.
- Do not make Nexus a required dependency for `init`, `doctor`, `status`, `resume`, or UI rendering.
- Do not replace the deterministic project-memory graph with a code-symbol graph.
- Do not let `spm` vendor, install, or publish Nexus itself.
- Do not attempt a deep runtime integration with Nexus-specific MCP or graph APIs yet.

## Constraints

- `spm` must stay fully usable without Nexus installed.
- The default config should leave Nexus disabled.
- Any Nexus guidance must make installation and upgrade ownership explicit: the repo user installs Nexus separately using upstream instructions.
- AGENTS guidance must remain concise enough to pass the project token-budget checks.
- Root `AGENTS.md` should remain owned by `spm` policy; Nexus should be scoped or referenced, not allowed to replace root planning guidance.
- Doctor enforcement should focus on deterministic checks that `spm` can verify locally, such as config, command availability, and bounded AGENTS wording.

## Proposed Approach

- Introduce a new optional `[nexus]` config section with fields such as:
  - `enabled`
  - `command`
  - a bounded AGENTS strategy indicator that keeps root ownership with `spm`
- Extend config templates and parsing so every repo has an explicit place to opt in later without making Nexus active by default.
- Extend `spm doctor` so that when Nexus is enabled it can validate:
  - the configured Nexus command exists on `PATH`
  - the repo has AGENTS guidance that says `spm` remains the planning source of truth
  - Nexus is described as code-impact or related-code analysis, not as the replacement for specs, tasks, or current state
- Extend adoption artifacts, migration guidance, and init-generated briefs so they explain:
  - how to install Nexus separately
  - when to use `spm` first
  - when to ask Nexus for code impact or related implementation surfaces
  - how to keep Nexus from taking over the whole project or root `AGENTS.md`
- Update repo docs and local AGENTS guidance so the coexistence pattern is durable for future adopters of Spec Embryo itself.

## Detailed Specification

- `.specpm/config.toml` should gain an explicit optional Nexus section.
- Default config emitted by `spm init` should include the Nexus section in a disabled state so the feature is discoverable but inert.
- When `nexus.enabled = false`, `spm` should behave exactly as it does today.
- When `nexus.enabled = true`, `spm doctor` should validate bounded coexistence rules.
- The first bounded coexistence rules should include:
  - `spm` remains responsible for specs, tasks, current state, handoffs, adoption structure, and deterministic planning workflows
  - Nexus is used for code impact, related code paths, and blast-radius-style analysis
  - root `AGENTS.md` must not imply that Nexus replaces `spm` as the planning authority
- Doctor findings for Nexus should use existing severity levels:
  - warning when Nexus is enabled but the command is missing or the guidance is incomplete
  - blocking only for clearly unsafe coexistence settings that explicitly delegate root project-memory authority away from `spm`
- Adoption artifacts should gain a dedicated Nexus coexistence section that explains:
  - Nexus is optional
  - Nexus is installed separately from upstream
  - Nexus should be configured only after the repo understands `spm` basics
  - Nexus should be scoped to code analysis rather than repo-wide planning ownership
- The direct agent brief should tell another coding agent to:
  - use `spm` for repo-memory truth and lifecycle actions
  - use Nexus only for code-affect analysis when needed
  - avoid overwriting root `AGENTS.md` with Nexus-generated content
- The migration guide should recommend a safe installation/verification sequence such as:
  - install Nexus separately using upstream instructions
  - verify the command resolves locally
  - enable Nexus in `.specpm/config.toml`
  - update AGENTS guidance with the bounded coexistence contract
  - re-run `spm doctor`
- README and repo-local AGENTS files should explain the division of responsibilities for self-hosting and future adopters.

## Edge Cases

- A repo may enable Nexus in config before installing it locally.
- A repo may have a working Nexus command under a non-default binary name.
- A repo may already have AGENTS guidance that mentions Nexus but incorrectly frames it as the planning authority.
- A repo may want Nexus-related guidance only in scoped folder-local AGENTS files rather than root.
- A repo may use Nexus rarely and still want `spm` defaults to remain lightweight.
- A repo may later add deeper runtime integration, so this slice should not hardcode an irreversible config model.

## Acceptance Criteria

- `spm init` emits a config template that makes Nexus discoverable but disabled by default.
- Project config parsing understands the Nexus section without breaking existing repos.
- `spm doctor` can validate the basic Nexus coexistence contract when Nexus is enabled.
- Adoption artifacts and direct agent briefs explain how to install Nexus separately and how to use it without letting it replace `spm`.
- Repo documentation explains when to use `spm` versus Nexus.
- Normal `spm` workflows remain functional with no Nexus installation present.

## Open Questions

- Should future slices add a dedicated `spm review prepare` or `spm resume --include-code-impact` flow once the external coexistence contract is proven useful?
