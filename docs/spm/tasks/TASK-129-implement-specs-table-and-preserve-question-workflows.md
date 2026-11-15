+++
doc_kind = "task"
id = "TASK-129"
title = "Implement Specs table and preserve question workflows"
summary = "Implement spec table and drawer questions with conflict, dirty-form and refresh protection."
status = "todo"
spec_ids = ["SPEC-062"]
depends_on = ["TASK-128", "TASK-137"]
blocked_by = []
priority = 1
owner_role = "implementation"
created_at = "2026-11-15T18:31:13.726Z"
tags = ["parallel-implementation"]
updated_at = "2026-11-15T18:31:13.726Z"
+++

# Scope

Implement P5 of SPEC-062, including the contracts, edge cases and acceptance criteria defined there. Preserve the checkpointed baseline and keep changes confined to this slice.

# Execution and review

- Implementation: Sol 6.1 High (`ui_implementation`).
- Technical decisions and UX review: Astra High. Escalate uncovered design decisions before implementing them.
- Run relevant automated checks and capture evidence required by the spec.
- Move to `review` when implementation and evidence are ready; resolve findings before `done`.
- The orchestrator commits the reviewed slice before its dependent slice starts.
- Update relevant local instructions with the agents-md-maintainer skill.

# Verification record

Pending implementation. No acceptance criterion is claimed complete yet.


# Detailed Astra implementation decisions

# TASK-129 — Specs table, question drafts and conflict contract

Implement after128's reviewed commit. Reuse127 DataTable/preferences/selection and128's host; no new grid, parser, mutation endpoint or browser storage for answers. Root owns managed docs.129 owns Specs route/table descriptors, SpecQuestions extraction from SpecDetail, question action/types/tests, the shared repository answer guard and detail revision field, plus the inspector's leave-guard extension.130 consumes the existing host activation interface and must not edit that guard. Coordinate any shared workspace/resource/DTO file through its designated owner rather than concurrent edits.

## Specs projection

Default columns: fixed selection/ID/title, canonical spec status, done/total, blocked, review and linked-task count; optional owner/updated/tags already come from the DTO. Use existing query/sort keys and progress, no body parsing or question-count expansion. Default taskScope=all is global progress; other taskScope/window choices clearly label subset progress. Spec archived status is independent of taskScope. Use the same page-local selection, copy, keyboard/simple/SSR modes and identity links as Tasks, with preferences keyed project+spec kind.

## Shared optimistic guard and action compatibility

Add `specRevision: string|null` to found spec detail, derived from documentSourceHash of the exact canonical SpecDocument already parsed. It is the full-file SHA256 (64 lowercase hex), not mtime, updatedAt, global workspace revision or a second read of the file. Missing provenance means the new form cannot safely submit: offer Reload, never silently downgrade to an unguarded form. Existing hand-built detail fixtures may explicitly use null.

Extend answerSpecOpenQuestions with an optional options argument `expectedRevision`; preserve its three-argument callers and existing return fields. Serialize answer operations through the existing repository document lock. Load/parse current spec under the lock, validate the expected digest when provided, then use existing applySpecAnswers to validate all submitted nonempty pairs against currently open questions. All-or-nothing: one stale pair rejects the whole batch. Revision mismatch or now-absent submitted question is a typed conflict; missing spec is typed not-found. Read current bytes again immediately before committing and reject changes since the loaded provenance even for legacy callers. Stage/replace this spec atomically using an owned temporary file, cleanup on failure; do not change generic document-write behavior across the repo.

The lock prevents concurrent answer calls racing each other; recheck detects observed external edits. It is not an OS compare-and-swap against arbitrary noncooperating editors between the final check and rename: document that narrow limitation, do not claim filesystem-wide transaction isolation or retrofit all writers here. Preserve the latest non-question content by applying to the freshly loaded spec, never the browser's old document.

Keep the single canonical POST `/specs/[id]?/answerOpenQuestions`, original question/answer fields and action/success/error/savedCount/answeredQuestions/evaluation response shape. Optional `specRevision` enables the guard; absence remains compatible with legacy clients, still benefiting from current-question validation and serialized writes. A supplied malformed/duplicate revision field is400, never treated as absent.409 means conflict,404 missing,400 validation; unexpected IO is a failed save, not a successful evaluation. Add response fields for submitted drafts/base revision/current revision/current questions as needed, without raw paths/stacks. Keep exact submitted answer text for redisplay; trim only the repository's existing saved-value normalization.

Successful writes remain successful if subsequent detail/evaluation refresh fails: return the committed result plus a separate refresh warning, do not relabel it400 or invite duplicate resubmission. Build evaluation and refreshed detail from one post-write context when available. Enhanced submits deserialize SvelteKit action responses with installed framework APIs; do not assume JSON.parse reproduces serialized action data. Custom handling must avoid default full-page invalidateAll/reset behavior in the drawer.

## Draft identity, refresh and conflict

Extract one SpecQuestions used by page and drawer. Draft state is ephemeral per mounted editor/spec: base revision, exact base question text, answer values, dirty/saving/error/conflict and last evaluation. Never match drafts by positional `open-question-N` across revisions; use exact normalized question text from the existing shared parser, with occurrence identity where needed. Preserve existing duplicate-question semantics; conflicting answers for the same normalized question must be visibly rejected rather than silently choosing one.

Dirty means values differ from the accepted baseline, including whitespace edits; returning all values to baseline is clean. During saving, disable editing/submit and freeze the submitted snapshot, with one in-flight submission per editor. No automatic write retry, optimistic answered status, or abort-as-proof-the-server-did-not-write. A transport failure retains the snapshot and says the outcome was not confirmed; fetch latest state for review before resubmitting when ambiguity exists.

Background/manual refresh may update metadata and capture a latest question snapshot, but cannot replace base revision, inputs, focus or editor instance while dirty/saving. An unchanged revision clears no draft. A changed full-file revision marks external-change/conflict, even if only surrounding text changed; explicit review is the safe acknowledgement. Retain old questions/answers, show current questions/decisions, and offer Review current version. On explicit acknowledgement, rebase only exact matching questions, retain unmatched answers in a labeled selectable recovery block, and keep them until explicit discard or acknowledged successful resolution. No automatic fuzzy rewording or reassignment.

No-JS canonical POST errors must render the submitted drafts, including removed questions, not empty textareas from the newly loaded DTO.409 renders old draft plus current question snapshot and an explicit acknowledgement checkbox carrying `acknowledgedRevision`; only a checked valid digest may supersede the old specRevision for the next save, and the repository revalidates it against current bytes. Matching current fields may be prefilled; unmatched draft stays visibly recoverable outside the submitted current-question set. A second external change yields another409. This is the same action, no second write path. JS uses the same acknowledgement semantics. No-JS list inspector links to the canonical form.

After confirmed success, clear only the submitted editor's draft, show its evaluation/count, refresh that detail and active Specs list through controlled resources, preserving query/selection/scroll. Refresh failures show stale-data notices separately. A response for a former identity cannot reset another editor or steal focus. If all questions disappeared, keep the success/evaluation visible.

## Transition seam and history

128 should centralize existing open/close/replace entity/open-full/route navigation decisions through its host/controller now, with an immediate-allow internal implementation; do not add unused form props/state in128.129 adds one host-owned asynchronous guard at that seam. Public link activation and host presentation contracts consumed by130 stay unchanged. The content registers dirty/saving state and save/discard callbacks; it does not manipulate history.

Clean transitions continue immediately. Dirty destructive transitions (close, entity/relation change, leaving route) offer Save and continue / Discard and continue / Keep editing. Keep editing is default and Escape. Save continues only after confirmed successful write; validation/conflict/failure keeps the editor and original draft. While saving, keep navigation pending; do not offer a misleading cancel-write. Same-entity section changes, list filters and docking changes that retain the editor need no prompt. Modified links opening a new tab do not destroy the current draft. Use an accessible confirmation owned by the host, with correct modal focus/inert behavior and no two simultaneous prompts; preserve the initiating target until resolved.

Use beforeNavigate for normal client navigation and beforeunload for browser exit/reload (browser-native wording; no abrupt-close recovery promise). Crucial installed-version fact: SvelteKit client.js shallow popstate returns before beforeNavigate. The host must retain the accepted editor until its own URL/ledger transition is approved. For a dirty owned shallow Back/Forward, restore the prior entry via the verified ledger delta, suppress that restoration's guard recursion, then prompt; on acceptance replay the intended delta once. Do not call preventDefault on popstate and claim cancellation, inspect private Svelte history keys, or reset/unmount the draft while the URL is temporarily traversing. Preserve scroll/focus and128's close semantics. Rapid repeated history events must coalesce to one pending transition with stale destinations invalidated. Test real browser Back/Forward, not only a simulated controller call.

## Targeted review gate

Legacy tokenless action/CLI still work; current token succeeds; malformed token400; stale question/removal/context-edit409 leaves file bytes unchanged; concurrent same-revision submissions produce one write and one conflict; second external edit during review conflicts again. Verify post-write refresh failure is not reported as failed mutation. Browser: page/drawer and noJS400/409/200 retain values/evaluation; double submit produces one POST; dirty refresh/focus refresh preserves text; slow old detail/action cannot overwrite another identity; modal Escape/close/entity/relations/full-page/normal route and actual shallow Back/Forward exercise all three choices; abrupt-close limitation explicit. Specs table runs reuse regressions and subset/archive/filters fidelity. Final129/130 integration and131 remain separate gates.

## Approved independent table checkpoint137

After127 is approved/committed,137 may run in parallel with128. Dependency137→127;129 waits for BOTH128 and137. Scope137: replace Specs cards with the reusable read-only table and its compact filters/columns/sort/density/paging/selection/copy. There is no requirement to retain Specs cards or introduce view=cards; only Tasks retains Board. Existing WorkspaceSpecRow, SPEC_SORT_KEYS, progressIsSubset and shared query/preference helpers are sufficient without service/DTO changes.

Exclusive137 files: web/src/routes/specs/+page.svelte, new data-table/spec-columns.ts, focused Specs table tests and separately named verification evidence. Reuse frozen127 components; do not edit DataTable/helpers, resource/query/services, root layout/inspector, canonical detail/action, app.css or other routes. Root coordinates any shared AGENTS update.128 must not edit Specs page during137; its first integrated row consumer remains Tasks.137 uses genuine canonical links and omits onInspect, so it has a live consumer without unreviewed inspector coupling.129 later adds inspector activation and questions to this reviewed table. Any discovered shared-component deficiency requires a serialized owner patch/review or deferral to129, never opportunistic overlapping edits.

Checkpoint evidence covers Specs table keyboard/simple/noJS, selection/copy/preferences, filters/paging and canonical navigation; global versus subset progress and spec archived versus taskScope; bounded rows/payload and no writes. Review a frozen manifest and commit before129 consumes it.137 cannot claim the final drawer/question or combined129/130 gates. Existing131 dependency on both final129 and130 remains unchanged.

## Independent-review clarifications

- Recovery survives every request: separate `recoveryQuestion`/`recoveryAnswer` fields carry unmatched text across400/409/200. The action validates/echoes those pairs for redisplay only and never passes them to applySpecAnswers. Preserve them after successful saves of still-current questions; the editor remains dirty and Save-and-continue cannot leave while unresolved recovery text remains. Copying is not discard. Explicit discard clears only the chosen recovery; for noJS an `intent=discardRecovery` submit to the SAME action redisplays the remaining form/drafts without a repository write and without claiming save success. Do not include answers in logs, URL or persistent browser storage.
- Duplicate normalized questions: ignore blank answers; accept equal answers after existing trim normalization; reject contradictory nonblank answers400 before write. Reuse/export existing normalization rather than duplicate parsing. Preserve applySpecAnswers' resolution of all matching occurrences and returned answeredQuestions ordering/repetitions. Keep legacy savedCount as the count of submitted nonempty pairs for API compatibility; the new UI labels actual resolved occurrences using answeredQuestions.length when present.
- Unknown shallow-history destination: never infer a delta. Retain the accepted editor/draft, use public replaceState to restore its accepted URL in the current entry, invalidate predecessor shortcuts/ledger proof for that entry, and queue the attempted destination. Keep editing stays there; successful Save/explicit Discard then replaces to the queued destination once. Preserve unrelated page.state fields without adopting unverified ownership. This fallback may coalesce/replace an unowned history entry; it intentionally does not promise exact history reconstruction. Generation guards prevent stale confirmations replaying a superseded destination. Test this separately from the owned-delta Back/Forward path.
- Confirmed-write/noJS refresh failure: store the committed action outcome in request-local server state before optional reloading. The canonical load executed after POST must recognize that outcome; failed reload or a now-missing spec renders a minimal saved-but-refresh-failed view with available evaluation and a retry GET, not a500/404 error page that erases the confirmed outcome. Do not fabricate an editable detail/revision from stale objects. Ordinary independent GET missing/error behavior remains128's404/error contract. Test an injected read failure after the repository write using real noJS POST rendering, not only a direct action-unit call.


# Specs table checkpoint split

TASK-137 owns the read-only Specs table consumer after TASK-127, in parallel with TASK-128. This task consumes both reviewed commits, adds inspector activation to that table and implements the guarded question workflow. No Specs Cards alternative is required; Tasks alone retains Board.


# Independent design review

A second Astra approved the final design after resolving recovery fields across separate no-JS POSTs, unverified shallow-history fallback, duplicate-question compatibility and confirmed-write rendering when the subsequent load fails. This approval is for the design only; implementation and browser/repository regressions remain required.
