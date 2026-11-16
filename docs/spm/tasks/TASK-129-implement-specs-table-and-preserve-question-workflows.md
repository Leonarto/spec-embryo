+++
doc_kind = "task"
id = "TASK-129"
title = "Implement Specs table and preserve question workflows"
summary = "Implement spec table and drawer questions with conflict, dirty-form and refresh protection."
status = "todo"
spec_ids = ["SPEC-062"]
depends_on = ["TASK-128", "TASK-137", "TASK-138", "TASK-140"]
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

- Implementation: Sol 6.1 High (`harness_implementation` after the serialized Timeline host patch); TASK-140 separately owns the backend write prerequisite.
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


## Integration addendum after138 — authoritative editor, latest reads and ownership

This addendum closes concrete integration gaps found in the approved138 code; it does not reopen the existing129 mutation, conflict, recovery or history decisions.137's Specs table and128 activation are already implemented.129 must reuse them, not rebuild the table. Implementation starts only after138 is reviewed and committed.

### Minimal migration of138's canonical draft guard

138 currently protects raw nonempty DOM answers with SpecDetail.hasAnswerDraft and InspectorDetailResource.allowFullRefresh, checked before a full request, before response acceptance and before same-ID loader-seed adoption. Do not simply remove these checks or leave the raw DOM rule permanently blocking129's Review current version.

Extract one persistent SpecQuestions/editor owner. Its independent state is: accepted base specRevision/questions and baseline values; current exact draft/recovery; latest observed question snapshot; frozen submitted snapshot and submission generation; saving/outcome/evaluation. Inputs and hidden submitted-question identity render from the base/draft model, NEVER directly from new detail.openQuestions. The incoming accepted detail is a latest-snapshot input. While dirty/saving/recovery exists, ingestion updates latest only and marks revision change; it cannot rebase, clear or remount the editor. Clean ingestion may adopt the new base. No generic asynchronous resource observer or second parser is required.

Delegate138's guard to that registered model once ready; retain conservative protection before registration and on callback failure. Unlike138's raw form rule,129 uses its approved baseline-relative dirty definition, plus saving/unknown outcome/unresolved recovery. Do not read FormData as the authoritative guard once129 disables controls: disabled answer fields are omitted. Freeze submitted values/FormData BEFORE disabling controls. Error/409/echo values seed unsaved drafts, not a new 'clean' baseline merely because the server rendered them. Whitespace edits and recovery remain protected.

A narrow compatible extension to the existing callback is sufficient: allowFullRefresh(candidate?: WorkspaceDetailEnvelope). Invocation without candidate is the request-start check; invoke with the validated candidate immediately before full acceptance or same-ID seed adoption. Existing zero-argument callbacks remain compatible. For a registered stable editor, a found same-entity candidate may be accepted while dirty/saving because the editor ingests it as latest and preserves its base. Keep the transport's identity/intent/epoch/revision checks and atomic metadata/all-window publication unchanged; never splice old questions into a new detail envelope to bypass the guard.

A candidate that would remove the editor subtree (not-found/deleted spec, incompatible identity) cannot silently discard a protected draft. For same-entity missing while protected, record a latest-missing/recovery condition in the editor, reject replacement and retain the entire old reader snapshot/DOM. Let the user copy/discard or complete the existing guarded transition; do not pretend Save can recreate a deleted spec. Clean missing responses keep ordinary404 behavior. Explicit entity/route transitions remain governed by129's existing host guard. No key by revision, sourceRevision, docking mode or page may remount SpecQuestions. This applies to same-ID loader seeds as well as fetch responses.

Distinct revisions remain mandatory: sourceRevision is the global atomic detail/relation snapshot identity; specRevision is the exact full-file SHA256 from canonical provenance. A global revision change alone does not rebase the form. A changed specRevision requires the approved explicit acknowledgement even if only surrounding text changed. Missing/null provenance may be shown, but cannot enable a guarded save or acknowledgement.

### Save authority and late reads

Before submit, freeze one submission's identity/base revision/exact pairs/recovery. Disable editing and duplicate submits; never make a transport abort stand for 'not written'. A confirmed action outcome belongs only to that editor/submission generation. Existing canonical action is still the sole write path.

Return an additive committedRevision (or equivalently named field) computed from the exact serialized bytes successfully written by the repository operation, alongside existing result fields. Do not derive it from a later reload, global revision or an old WeakMap entry on the pre-write document. This allows a successful outcome to remain authoritative when optional post-write loading fails. Preserve the existing return fields and legacy clients.

At confirmed success, and before the post-outcome reload, invalidate outstanding reader work from before the mutation: increment full/relation acceptance epochs/sequences, abort requests, clear their pending indicators, and retain the displayed snapshot/desired page vector. Provide one small public resource invalidation method and its reader/controller adapter; do not simulate entity clearing/select(undefined), which would unmount the editor, or call invalidateAll. No old full or relation response may become 'latest' after the committed result. Use the same invalidation before an explicit latest-state read following an ambiguous transport outcome. Never rank or order SHA hashes to guess freshness.

On confirmed success, clear only the frozen successfully resolved answers, retain unmatched recovery, and preserve success/evaluation even when all questions disappear. Establish a new clean baseline only from the confirmed written question state/revision or an explicitly accepted subsequent snapshot; do not label arbitrary later reload data as the submitted version. If a fresh read has a different specRevision, it is a subsequent external version and follows the existing acknowledgement policy. A reload failure shows the confirmed result plus stale-data warning; it cannot turn success into failure or silently re-enable duplicate retry. An ambiguous transport failure retains the submitted draft and 'outcome not confirmed', reads latest for review without automatic resubmission, and never infers confirmed success solely from similar text.

No-JS continues the existing request-local action-result contract. A committed action outcome is recorded before optional load/evaluation so page loading cannot erase it with500/404. Error/409 drafts and echo-only recovery must also survive their render; if the current spec is missing, show the submitted text as recovery with the truthful error status rather than fabricating an editable current revision. Native GET failure behavior stays unchanged. No new mutation endpoint or browser persistence.

### Serialized integration and owners

1. Complete and commit138, including its generic Filters/list relation carry. Do not bypass its remaining performance/runtime gates to start129.
2. UI130 gets a short exclusive window on controller/InspectorHost only to integrate optional navigationScope with default page and the expanded Timeline label/registry contract. Timeline route URL builders reuse138's committed retainListRelationIntent for trace/mode/fallback/related-spec changes retaining the same inspect. Review the small shared-host delta and have root record/commit the agreed checkpoint before handing those files to129. Avoid importing uncommitted Timeline projection code into the generic host; default page behavior remains a live Tasks/Specs consumer.
3. Transfer exclusive ownership of repository question guard, spec revision/detail validator changes, canonical action/types/load recovery, SpecQuestions/SpecDetail/CanonicalDetailReader, resource acceptance/invalidation and inspector leave guard to H129. UI130 keeps Timeline route/components/query/projector/tests/evidence and does not edit those shared detail/host files. Shared AGENTS and managed docs remain root-owned. Any additional shared fix is explicitly serialized through its owner.
4. UI130 may finish its own browser/performance work against the reviewed committed host baseline or an exact isolated snapshot while H129 implements. Those measurements must identify their source and do not certify the new129 guard before it is frozen. Final combined129/130 inspector/history/trace/relations checks wait both reviewed commits;131 waits129,130 and138. No final combined claim from parallel mutable sources.

Focused additions to129's already approved gates: dirty/saving metadata refresh updates latest without changing base/input/DOM; file-revision changes (including surrounding text) and global-only changes distinguish correctly; not-found candidate retains recovery while protected; POST/error echo is not accidentally clean; disabled controls cannot bypass protection; old full/relation response after confirmed or ambiguous write is discarded; success followed by refresh failure preserves committedRevision/outcome; later external version requires acknowledgement; same-ID seed and both page/drawer use the same owner. Existing real shallow Back/Forward, noJS409/second conflict, recovery and double-submit gates remain mandatory.

### Independent integration-review closure I129-1 — loader seeds after write outcomes

Resource request epochs alone do not protect props-based loader seeds: select(seed) otherwise creates a new epoch without knowing when that loader started. Use the following conservative policy instead of adding server loader provenance or trying to order hashes/timestamps.

Maintain a browser-document-session seed barrier keyed by opaque projectKey + spec identity. On a confirmed write outcome OR an ambiguous transport outcome, synchronously mark that identity fenced before exposing the outcome or starting its controlled latest-state read, and invalidate pre-outcome resource full/relation work as specified above. The barrier is small client coordination metadata (identity/generation only), never a document/draft cache or persistent storage. Canonical and inspector seed adapters consult the same barrier.

For a fenced identity, every subsequent loader-provided seed is ineligible for snapshot adoption and for the editor's latest/conflict preview, regardless of whether its SHA matches a known value or its generatedAt appears newer. Mark the incoming seed observed so it does not repeatedly trigger the same path; reconcile URL intent from the current URL, but do not invoke select with that seed, publish its metadata/questions/title, or classify it as a later external edit. Initial seeds of unfenced entities keep138's existing behavior.

The fence persists for that entity for the entire browser document session: successful controlled refresh, explicit acknowledgement/rebase, another save, Close, reader unmount or A→B→A does not reopen seed acceptance. A real document reload/new browser document starts fresh. Sharing this identity-only barrier across reader instances prevents reopening the same spec through another presentation from bypassing it. Do not use localStorage or weaken normal138 seed freshness checks for unfenced identities.

A fenced seed notification may request a controlled read for the current live identity and complete desired page vector, subject to129's editor preservation guard. Coalesce notifications into an already active controlled request with identical identity/intent; do not abort/restart it or create a retry loop merely because a stale seed arrived. If no matching request is active, one fresh controlled read may run. Its acceptance uses the resource's own post-barrier generation/epoch and the existing atomic guards. Completion does NOT lift the fence: a still-later loader seed remains ineligible and may only trigger another current read. Errors retain the prior snapshot/outcome and explicit Retry; there is no fallback to the rejected seed.

At the outcome boundary, an editor latest candidate captured before that boundary is no longer an authoritative post-outcome review target. Preserve base/drafts/recovery and confirmed outcome; clear or visibly mark that old candidate stale until the controlled read supplies current data. An action's confirmed writtenRevision/question outcome remains tied to its submission generation and is not a loader seed; do not feed an action payload through an untyped seed bypass to evade this policy. Only controlled post-barrier reads may update the reader/latest external snapshot.

Required deterministic integration tests use real seed-adoption glue, not only fetch mocks: loaderA starts before POST, outcomeB fences, then seedA arrives (a) before the controlled read returns and (b) after it returnedB; neither changes accepted/latest/base/title nor becomes an external-conflict candidate. Repeat for ambiguous outcome, same-ID seed with different rel.* intent, A→B→A and canonical↔inspector remount in the same document. Verify the initial unfenced SSR seed still avoids duplicate fetch, coalescing keeps one matching request, no rejected-seed fallback occurs on read failure, and a real new-document load may use a fresh SSR seed. No heavy tests are requested during138's performance window; these belong to129 implementation/review.


# Independent integration design review

# TASK-129 integration addendum review

**Status: APPROVED.** I129-1 resolved; no outstanding design findings.

Reviewed the complete integration addendum and final `Independent integration-review closure I129-1` in `/private/tmp/spm-task129-decisions.md`, against the previously approved 129 decisions and current 138 reader/resource/SpecDetail integration. This is design review only; no source edits, tests, builds, browser sessions or performance work were performed.

## Resolved finding I129-1 — loader seeds bypass request epochs

The original addendum invalidated resource-owned full/relation requests after a write outcome but did not establish provenance for props-based same-ID loader seeds. `CanonicalDetailReader.svelte:27` passes new props to select(seed), and `detail-resource.ts:29` creates a new epoch on adoption. A loader begun at revision A could therefore arrive after confirmed B and be misrepresented as a subsequent external version, even after a controlled refresh.

The final closure resolves this through a shared browser-document-session barrier keyed by projectKey/spec identity. Confirmed or ambiguous outcome fences synchronously; subsequent loader seeds cannot affect snapshot, title, latest/conflict state or base. The barrier survives successful refresh, close, remount and A→B→A, and only a new browser document resets it. Same-intent notifications coalesce with active controlled reads; errors have no rejected-seed fallback. Pre-outcome latest candidates are explicitly stale. The added deterministic gates cover both late-arrival orderings, ambiguous outcomes and page/drawer remounts.

Implementation must apply this existing decision to initialization as well as reactive seed adoption: current CanonicalDetailReader initializes readerState from its prop and renders a prop fallback before/without a snapshot. Fenced remounts must not transiently expose that seed. This is covered by the closure's prohibition on publishing metadata/title and its remount test, not a new scope requirement. The barrier remains browser-only identity metadata, never a server-global or persisted document cache.

## Coherence of the remaining addendum

- Persistent editor ownership separates accepted base, exact drafts/recovery, latest observation and frozen submission. Candidate-aware allowFullRefresh is a narrow compatible extension; found same-ID metadata can refresh without rebasing protected inputs. Missing candidates retain the protected reader/editor and truthful recovery state.
- Freeze submission before disabling controls; POST error echoes remain unsaved. Separate global sourceRevision and exact specRevision prevent unrelated workspace changes from rebasing the form.
- committedRevision derives from successfully written serialized bytes, independent of optional reload. Outcome-boundary invalidation retains the displayed snapshot and page intent while rejecting prior full/relation work. Confirmed success, unknown outcome, later external edits and stale reload failures remain distinct.
- Existing no-JS request-local outcome/recovery handling, legacy tokenless callers and single canonical action remain intact. No new mutation endpoint, parser, generic observer or browser persistence is introduced.
- Ownership is serialized: committed 138, then a separately reviewed/committed UI130 shared-host patch, then H129 owns the reader/controller/editor/action changes. Timeline-only work may continue on an identified isolated/committed baseline. Combined guard/history/relations/trace verification still waits both reviewed commits.

Ready for implementation after the stated prerequisite commits and gates. Approval does not certify implementation, tests, TASK-130 mutable work or final performance.


# Backend prerequisite split

TASK-140 implements the approved guarded-write backend in isolation while TASK-138 completes its performance gate. TASK-129 consumes the reviewed and committed result; it owns source-revision transport, canonical action outcomes, editor/recovery UX and navigation guards. No concurrent edits to the inspector/controller are permitted during the serialized TASK-130 host integration.


### Backend140 serializer compatibility clarification

The guarded write preserves the latest canonical fields/body using existing serializeSpecDocument/applySpecAnswers normalization, not arbitrary source formatting or unknown TOML attributes. Unknown-attribute round-trip preservation was not supported by that serializer and is not added by140/129; do not claim it. The constructed returned nextSpec has no inherited source-provenance hash. Its additive committedRevision is the digest of exact written bytes; refreshed detail specRevision still comes from genuine parsed-file provenance. This keeps the backend checkpoint compatible without a generic writer refactor.
