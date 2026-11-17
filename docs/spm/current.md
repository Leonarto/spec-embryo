+++
doc_kind = "current-state"
id = "CURRENT"
title = "Current Project State"
summary = "Harness interoperability, the functional UI revamp and the precompiled UI runtime are reviewed and integrated. Final volume performance and acceptance remain open."
focus = "Implement SPEC-063 multi-repository local UI, then deliver GitHub and prepare npm release; Sol6.1 orchestration and Terra6.1High agents."
active_spec_ids = ["SPEC-063"]
active_task_ids = ["TASK-142", "TASK-143"]
blocked_task_ids = []
next_action_hints = ["Implement approved SPEC063 backend and client slices with Terra6.1High agents in isolated copies.", "Independently review and commit each slice; integrate targeted multi-repo isolation and package checks serially.", "After feature completion push GitHub and prepare npm release; stop before final publish for user 2FA per publish skill."]
last_handoff_id = "HANDOFF-20260402T163915"
updated_at = "2026-11-17T14:23:58.672Z"
tags = ["v1", "self-hosting", "spec-workflow", "context"]
+++

# Current State

This file is the explicit checkpoint for interrupted work. It should answer:

- what the project is trying to do right now
- which specs and tasks are active
- what should happen next
- what is blocked
- where a future human or agent should resume

## Narrative

The post-`0.3.1` roadmap implementation is complete. `SPEC-055` through `SPEC-060` are done, and `TASK-111` through `TASK-122` are done. SpM now has user-local portfolio views, explicit cross-project links, project profiles, deterministic legacy import, `resume --since`, memory ranking controls, bounded hook planning, release planning, schema-versioned JSON outputs, compatibility tests, and self-hosting test diagnostics.

The user authorized parallel implementation of `SPEC-061` and `SPEC-062`. Sol 6.1 High implements both tracks; Astra High owns technical decisions and UX review. A separate Astra investigates implementation and context practices, including simplicity, code relationships, review and model routing. Baseline commit `fa025f2` preserves the previous roadmap and reviewed plans. UI scope remains inspection, filtering, selection, and copying, preserving the existing spec-question response workflow.

SPEC-061 P0/P1 is complete through `d164e75`; P2 is explicitly deferred. The SPEC-062 shell, shared queries, Tasks/Specs grids, graph optimization, persistent inspector and fresh-read IO are reviewed and committed. TASK-140 guarded answer writes are committed as `ab9212a`, functional TASK-138 bounded details as `88cb574`, and the serialized TASK-130 inspector adapter as `d4e1b01`. The research report remains `docs/agent-workflow-research.md`; its two proposed skills are not installed, while bounded slices and independent review practices are in use.

TASK-129 guarded questions and TASK-130 Timeline are independently reviewed and complete. TASK-138's bounded detail transport and private exact-byte parse memo are correct and integrated, but its final DEV latency gate still fails at Task398.0ms / Spec523.5ms p95 against300ms. Historical tests, diagnostics and the rejected bounded-admission candidate remain in its task and verification records; no threshold was relaxed.

TASK-141 replaces ordinary DEV startup with independently reviewed precompiled Node client/SSR assets and explicit contributor `--dev`. Code, actual read-only installed-package behavior and browser question flows are approved. The merged build reproduces the exact196-input/604-output manifest. Serial integrated checks pass489 tests/10414 assertions, build, Svelte0/0 and AGENTS budgets; the separately configured package tests pass2/121. Bun-recorded product line coverage is93.64%, excluding compiled browser execution.

TASK-131's reusable component accessibility evidence is reviewed and committed as86609cc: ten axe states, keyboard, forced-colors and reduced-motion checks, with two narrow semantic fixes. Native200% zoom remains pending at the user's request; screen-reader sessions are unavailable. Its finite runner is being adapted to the compiled runtime. Source/runner review and commits precede final volume latency, loading and retention gates. TASK-138 and TASK-131 remain open; the final matrix is `web/verification/SPEC-062-acceptance.md`.

## Notes

- Prompt-return mode remains first-class to avoid unnecessary nested agent spawning.
- New substantive specs should follow the explicit draft -> user iteration -> review -> fix loop.
- The repo should increasingly manage itself through `docs/spm/` and `spm` commands instead of ad hoc memory.
- Adoption improvements should extend Codex/Claude behavior with repo-local workflow guidance, not reimplement model-native context handling.
- The completed roadmap was intentionally grouped into a small number of coherent specs instead of ten isolated one-off tasks so future implementation can sequence related work with fewer cross-slice rewrites.
- Managed document creation now relies on a shared repository lock; future create flows should preserve that invariant instead of adding unsynchronized ID allocation paths.
- Changed-item reporting now has nine coupled invariants: identity-plus-path human formatting, one normalized `changeHint` for compact summaries, one compact raw `statusCode` for structured consumers, a managed-first presentation order limited to human status-style summaries, an explicit omitted-count signal when human-visible summary slices are truncated, shared helper logic so the truncation note wording stays aligned across status-style outputs, an explicit resume context-pack note when additional changed files were moved into offloaded detail, a matching `nextInspectIds` trail for the highest-value omitted changed files, and typed `nextInspect` entries so callers can distinguish doc refs from changed-file paths.

## User budget checkpoint

The user asked to conserve remaining tokens for other projects. The current pass stopped after closing the in-flight sample; no further diagnosis, optimization or verification is authorized by this checkpoint. Product implementation is complete through abf426c and harness preparation through3108b5c. The final compiled measurements report detail p95 Task725ms/Spec668.6ms (limit300), warm lists2231.5ms/1592.1ms (limit800), and initial loading150ms FAIL. Cold stopped at6/40 valid samples; no aggregate p95/PASS. Supplemental interactions and100-cycle retention were NOT RUN. These results are recorded but have not received independent result review.

All owned browsers/servers are closed, the active lease is absent and recorded stop/dependency audits pass. Final fixture-after inventory was not run after the budget stop; initial inventories remain. The automatic reviewer rejected starting the next cold sample because it contradicted the stop instruction; no process or measurement resulted. Durable evidence: `web/verification/task131-final-run/checkpoint.json` and adjacent manifest/raw files. TASK138/131 and SPEC062 stay open; no further work should start merely to turn those statuses green.

## Resource-conscious continuation

The user resumed work, replacing earlier Astra/Sol routing with Sol6.1 orchestration and Terra6.1High subagents, and reported a saturated/slow computer. The prior budget stop is historical, no longer an instruction to stop all work. Begin with bounded read-only source/evidence review; avoid concurrent local workloads and repeated benchmark series. Host contention can affect timings but has not been quantified for the historical run, so it neither proves the cause nor converts failed results into passes. Native200% zoom remains deferred; no new permission to disturb unrelated processes.

The resumed read-only triage and independent evidence review are complete. No speculative performance code change was justified. Standalone volume payload acceptance now passes with two actual HTTP responses: Tasks37116bytes/Specs35629bytes for100rows, exact fixture/oracles/build, unchanged documents and clean process closure. Independent review and durable raw responses live under `web/verification/task131-volume-payload-*`. No timing series was repeated on the saturated host; remaining performance, cold, interaction and retention acceptance is open.

## Multi-repository delivery

The user requests one local server serving named registered repositories, with registration through UI and CLI and a selector that preserves unsaved-answer guards. Reuse the portfolio registry with per-request project query identity and expected-workspace guards. SPEC063 is independently approved after collision/identity/API fixes; TASK142 and143 implement disjoint slices. Once complete, the user wants GitHub push and npm distribution. Publishing preparation follows the local skill and leaves final2FA publish to the user. Prior SPEC062 latency failures and incomplete acceptance remain recorded and are not waived.
