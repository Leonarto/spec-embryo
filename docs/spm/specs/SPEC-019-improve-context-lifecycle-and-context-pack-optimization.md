+++
doc_kind = "spec"
id = "SPEC-019"
title = "Improve context lifecycle and context-pack optimization"
summary = "Make spm a better context orchestrator for Codex and Claude by adding compact context packs, scoped memory, consolidation, evals, retrieval ordering, and cache-aware prompt assembly without duplicating model-native reasoning."
status = "active"
task_ids = ["TASK-066", "TASK-067", "TASK-068", "TASK-069", "TASK-070", "TASK-071", "TASK-072"]
tags = ["context", "memory", "agents", "optimization"]
updated_at = "2026-04-25T22:56:00.000Z"
+++

# Problem

Spec Embryo already has a strong deterministic memory layer: specs, tasks, current state, handoffs, retrieval, links, and compact briefs all live in the repo and stay readable to humans and agents. That gives the project durable context, but it does not yet give agents a full context lifecycle.

In practice, another coding agent still has to decide for itself:

- how much of the managed memory to load right now
- which detail should stay in the active prompt versus be left in files
- how to distinguish fast-changing session context from durable repo knowledge
- when quick notes should be consolidated into stable memory or allowed to expire
- how to tell whether a retrieval or context-pack strategy is actually helping
- how to assemble provider-facing prompt bundles so stable context is reused efficiently

Modern agents such as Codex and Claude already perform short-lived summarization, local reasoning, and prompt adaptation. Spec Embryo should not rebuild those model-native behaviors inside the tool. The better role for `spm` is to make repo-specific context selection, durable memory shaping, and execution handoff more explicit, smaller, and more testable.

Without that boundary, future context work risks going in two bad directions:

- overbuilding an internal pseudo-agent that competes with the model instead of serving it
- continuing to dump increasingly large repo context into prompts without lifecycle controls, scopes, or evals

# Goals

- Make `spm` better at assembling compact, task-relevant context without requiring large prompt dumps.
- Add explicit context-lifecycle concepts such as packing, compaction, consolidation, and staleness handling.
- Introduce bounded memory scopes so repo memory, session notes, and broader team guidance do not blur together.
- Improve retrieval output ordering and section-level selection so long-context usage is more effective.
- Add deterministic evaluation surfaces for memory capture, retrieval, and context-pack quality.
- Make provider-facing prompt assembly more cache-friendly where supported, without changing source-of-truth semantics.
- Keep Spec Embryo complementary to Codex, Claude, and similar agents instead of reimplementing their model-native strengths.

# Non-Goals

- Do not build a new general-purpose chat memory system inside `spm`.
- Do not replace model-native summarization, reasoning, or interactive planning loops with a hidden in-tool agent.
- Do not require a specific model provider, API, or hosted service.
- Do not make Nexus or any other external graph tool part of the core context lifecycle.
- Do not turn the web UI into a second source of truth for context state.

## Constraints

- The repo remains the durable source of truth.
- Deterministic file-backed behavior stays the default whenever explicit code is enough.
- New context features must degrade gracefully when a project uses only deterministic output and no subprocess backend.
- Managed context artifacts must stay readable and reviewable in the repo.
- Context-optimization work should prefer selection, ordering, and offloading over increasingly aggressive inline summarization.
- The system should help external-project agents ask for fewer human interventions, not more.

## Proposed Approach

Treat context management as a pipeline rather than a single retrieval command:

1. Define the product boundary clearly.
   - `spm` owns durable repo memory, packaging, and lifecycle policy.
   - Codex, Claude, and similar tools own reasoning over the provided context.
2. Add deterministic context packs.
   - Build compact bundles for implementation, review, migration, and resume flows.
   - Offload heavy supporting detail into durable artifacts and link to it instead of always inlining it.
3. Add explicit memory scopes.
   - Distinguish fast session context from repo memory and broader organizational guidance.
4. Add consolidation and staleness management.
   - Let short-lived capture become durable memory only through an explicit consolidation path.
5. Add evals.
   - Measure whether retrieval, packing, and consolidation actually improve downstream usefulness.
6. Improve packaging quality.
   - Order evidence more deliberately and assemble stable backend prompt prefixes where provider caching makes that worthwhile.

## Detailed Specification

### 1. Context architecture contract

- README, architecture docs, and managed project memory should explicitly state that Spec Embryo is an assistant-sidecar and project-memory layer around other coding agents.
- New context features should be justified in terms of durable repo knowledge, reproducibility, or token efficiency, not because a model can already summarize text.
- `resume`, `memory brief`, and later context-pack flows should prefer returning structured guidance and references over pretending to be the model's planner.

### 2. Deterministic context packs and compaction

- Add a first-class concept of a context pack for common work modes such as implementation, review, migration, and resume.
- A context pack should include:
  - required high-signal summary
  - selected linked docs or sections
  - explicit reasons for inclusion
  - optional supporting artifacts that were intentionally offloaded rather than inlined
- Compaction should reduce prompt size by:
  - extracting strong sections instead of whole documents when possible
  - eliding repeated context
  - turning large supporting detail into durable referenced artifacts
  - preserving an auditable full-fidelity source on disk
- Progressive disclosure should be explicit: "must read now" context first, supporting detail second.

### 3. Scoped memory

- Memory should support at least these conceptual scopes:
  - session: fast-changing work notes or ephemeral capture
  - repo: durable project knowledge managed by Spec Embryo
  - org or shared policy: broader guidance that may be readable but more constrained for mutation
- The first implementation may expose these scopes through deterministic folder layout, config, and retrieval filters rather than a complex database.
- Write rules should be explicit so another agent can tell what it may update versus only read.

### 4. Consolidation and staleness management

- Quick-capture memory should not automatically become durable repo knowledge.
- Add a deterministic consolidation flow that can:
  - merge or deduplicate candidate memory
  - detect contradictions against existing managed docs
  - apply explicit staleness or retention policy where appropriate
- Consolidation output should remain inspectable by humans and reviewable in git.

### 5. Evaluation harnesses

- Add lightweight deterministic eval flows for:
  - retrieval precision and recall in realistic repo questions
  - context-pack usefulness and token size
  - consolidation correctness, deduplication, and stale-memory handling
  - injection quality, meaning whether the selected context actually reflects the intended source of truth
- Evals should live close to the repo and be runnable in CI or local verification.

### 6. Retrieval ordering and section-level packing

- Retrieval and briefing should become more section-aware and order-aware.
- The strongest evidence should be surfaced first.
- Whole-document inclusion should be the exception when a smaller stable slice is enough.
- Briefs and packs should distinguish:
  - mandatory context
  - relevant supporting context
  - optional expansion material

### 7. Prompt-cache-aware backend packaging

- For API-facing or subprocess backends that benefit from stable prompt prefixes, prompt assembly should prefer:
  - static instructions and stable project policy first
  - slowly changing repo context next
  - volatile task-specific or query-specific data last
- This optimization must not change the repo's source-of-truth model or make prompt caching a requirement for correctness.

## Edge Cases

- A project may use only deterministic output and still benefit from better retrieval ordering and compact context packs.
- A project may use Codex or Claude interactively and not want `spm` to summarize aggressively on its behalf.
- A project may want org-level guidance to be readable but not writable by normal repo workflows.
- Session memory may need to exist outside the repo by default while still allowing durable checkpoint promotion when warranted.
- Some providers may not expose prompt caching or may change their caching rules over time, so packaging optimizations must stay optional.
- Large legacy repos may have enough managed docs that section-level extraction matters more than document-level ranking.

## Acceptance Criteria

- The managed roadmap defines sequenced tasks for context architecture, compaction, scoped memory, consolidation, evals, retrieval ordering, and cache-aware packaging.
- Project docs explicitly state that `spm` complements model-native reasoning rather than attempting to replace it.
- Current state points at the new context-lifecycle spec as an active focus.
- Follow-up implementation slices can be delivered incrementally without breaking deterministic-only usage.
- Future context features are grounded in measurable usefulness, bounded scope, and repo-local source-of-truth semantics.

## Open Questions

- Should session-scope memory default to a repo-local ignored path, a temp path, or a configurable hybrid?
- Should org-scope memory be modeled as read-only in the first implementation, or only constrained by convention and AGENTS guidance?
