+++
doc_kind = "task"
id = "TASK-140"
title = "Guard spec question writes against revision conflicts"
summary = "Implement the isolated backend subset of TASK-129: optional revision preconditions, locked atomic writes and exact committed revision, preserving legacy callers."
status = "in_progress"
spec_ids = ["SPEC-062"]
depends_on = ["TASK-139"]
blocked_by = []
priority = 1
owner_role = "implementation"
created_at = "2026-11-16T03:57:12.748Z"
tags = ["parallel-implementation", "questions"]
updated_at = "2026-11-16T03:58:37.223Z"
+++

# Execution and review

Implementation: Sol 6.1 High (`ui_implementation`) in an isolated exact bf542e1 snapshot, excluding all uncommitted TASK-138/130 source. Astra High owns decisions and independent review. Root integrates the reviewed backend patch serially after TASK-138 commits, then commits TASK-140 before TASK-129 consumes it. No editor/action/inspector implementation is included here.

# Verification record

Isolated implementation is in progress against bf542e1. Initial writer/repository target passes 29 tests / 185 assertions; independent review and integration remain pending. This is the approved backend subset of TASK-129, without added product scope.

# TASK-140 — independent guarded answer-write checkpoint

APPROVED technical split of the already approved129 backend work. No new product scope. Implement and review in a disposable exact bf542e1 checkout with dependencies linked; do not edit shared working sources during138 diagnosis/gates. No tests/builds during a reserved138 CPU window without root coordination.

## Scope and contract

- Extend existing answerSpecOpenQuestions(root,id,answers,options?) with optional expectedRevision. Keep all three-argument callers and existing result fields/semantics; add committedRevision from the exact serialized Buffer successfully written. No new command, endpoint, action or model behavior.
- Use the existing shared repository document lock. Under it load/parse current canonical spec, validate a supplied64-lowercase-hex digest against exact loaded provenance, validate all nonempty pairs and reuse applySpecAnswers. Missing spec, stale revision/absent question and ordinary validation have typed distinguishable outcomes for129's later action mapping; errors remain Errors and old CLI/action callers must continue functioning. Reject malformed supplied tokens; never treat them as omitted.
- Reuse/export existing question normalization, not a parallel parser. Blank answers remain ignored; equal trimmed answers for duplicated normalized question text remain valid; contradictory nonblank answers are validation failure before any write. Preserve existing resolution of all matching occurrences and returned order/repetitions. A stale pair rejects the entire batch.
- Recheck current target bytes immediately before committing even for tokenless callers. Apply edits to the current loaded document, preserving unrelated content. Use an exclusively created owned temporary file in the destination directory and atomic replacement for this answer operation only. Preserve ordinary file permissions; keep temp ownership/cleanup explicit and never remove a preexisting foreign file after failed exclusive creation. Revalidate the shared lock lease before commit. A target leaf that becomes nonregular/symlink during this transaction is rejected rather than replacing the link; keep configured directory resolution and do not add a repository-wide containment policy.
- Compute serialization/committedRevision before rename so a successful replacement cannot later be relabeled failed merely because of a reload/evaluation/cleanup step. Track the committed result outside the existing withLock callback: if its finally/release fails after a confirmed rename, return that committed result with an additive cleanup warning, rather than throwing an apparent failed save. Do not modify generic withLock to swallow errors for other operations. A pre-commit failure still throws normally. Return the committed spec/result without a mandatory post-write reread. Do not attach the pre-write provenance hash to newly written bytes. The lock plus final-byte recheck detects observed external changes; preserve129's documented final-check→rename race limitation for noncooperating writers, without claiming filesystem compare-and-swap.

## Ownership

Exclusive candidate files: repository.ts imports/result type/answer operation; spec-questions.ts shared normalization/answer validation; a small local IO helper under src if genuinely needed; focused backend tests and local guidance/docs coordinated by root. No changes to storage's generic writer/lock policy, document-reader/loadProjectContext/read-pool, detail v2/service validators, specRevision detail field, canonical actions/loaders, editor, resources/controllers, URL builders, Timeline, root layout or app styles. Any discovered shared deficiency returns to Astra/root for an explicit serialized decision.

## Review gates

Legacy three-argument call and existing CLI/action tests still pass. Exact current digest succeeds and committedRevision equals SHA256 of bytes actually on disk; original result fields and occurrence behavior remain intact. Supplied malformed token fails; stale token, removed/stale question and changed surrounding text leave target bytes unchanged. Two concurrent same-revision saves produce exactly one write and one conflict. Duplicate blank/equal/contradictory inputs follow the approved semantics. A controlled external edit after load but before final check is detected; no sleeps as race synchronization. Serialization/temp/write/rename failure cleans only owned temp and preserves original bytes before commit; same-directory atomic behavior and permission preservation are covered. Missing target/changed leaf/lease loss fail before replacement. Inject post-rename lock-release failure and verify committed result/digest plus separate warning, never an apparent failed save. No context-IO/performance or web-editor claims from this checkpoint.

## Integration order

140 has no semantic dependency on138 detail transport: its current production consumers already exist. The isolation requirement is operational ownership and baseline protection. Default integration is after138's reviewed commit, then apply the exact reviewed140 patch to the then-current tree, resolve any repository overlap explicitly, rerun affected backend compatibility checks and commit140 before129 consumes it. If root elects earlier integration, it must first coordinate138's new exact repository/source baseline and repeat affected functional/build/performance gates; previous138 timings cannot certify different bytes. Never merge through a live perf/frozen-source window.

129 consumes committed138 + committed140 + the reviewed serial130 host adapter checkpoint. It adds detail specRevision, HTTP mappings/noJS recovery and the persistent editor/leave guard on top; none belong in140. UI Sol may author140 while H diagnoses138, then ownership returns to root for review/integration and the previously agreed129 handoff. Root owns task/spec/current-state changes and commit sequencing.

## API precision for implementation

Use exported SpecQuestionWriteError extends Error with code:'not_found'|'conflict'|'validation'. Optional reason is 'revision'|'question'|'target_changed' for conflicts and 'expected_revision'|'answers' for validation. Missing spec at lookup is not_found; disappearance/type/byte replacement observed after loading is conflict/target_changed. Loss of lock ownership or inability to verify its owner is an ordinary write-ownership/IO Error, not a content conflict that129 should misrepresent as409 requiring question acknowledgement. Filesystem IO errors likewise remain ordinary Errors. Keep useful stable messages without exposing private paths in future action responses.

Signature options?:{expectedRevision?:string}: undefined is omission, including an explicitly present expectedRevision:undefined. This follows ordinary TypeScript optional semantics and preserves existing three-argument use. Null, empty string, non-string and any non64-lowercase-hex supplied digest are validation/expected_revision before document IO. An untyped null/nonobject options argument is invalid, not permission to bypass validation.129's HTTP FormData boundary separately rejects malformed/duplicate supplied fields and must never turn an empty supplied token into undefined; that HTTP rule does not require a hasOwn rejection for a TypeScript undefined option.

AnswerSpecQuestionsResult adds committedRevision:string and cleanupWarning?:string. Existing fields and their meanings remain. A warning is a post-commit diagnostic, not a failed save. No public IO-injection argument or generic lock changes. A small answer-local helper may expose an @internal IO-operations object for deterministic scoped spies/barriers; do not re-export it from the public index, document it as product API, or add runtime setters/configurable callback registries. Tests restore spies and isolate concurrent fault injection so no unrelated read/write path is affected.

The lease verifier stays local to this operation and checks the exact supplied lease owner (token, PID and its owner path) before replacement. It must not infer ownership from mere lock-directory existence, replace a foreign owner or delete another writer's lock. This refines140's already required precommit ownership check; it does not rewrite withLock policy.

## Serializer and returned-object provenance

Reuse the existing serializeSpecDocument and applySpecAnswers behavior exactly. Here 'preserve unrelated content' means applying the answer operation to the latest loaded canonical fields and body, under the existing canonical serialization/Markdown normalization. It is not byte-for-byte formatting preservation or round-trip retention of unknown TOML attributes; the existing serializer drops unsupported attributes, and140 does not introduce a new generic serialization policy. Document this existing limitation rather than implying stronger preservation. Test known canonical fields and unrelated body sections from the latest loaded version against the existing serializer oracle.

Return the newly constructed nextSpec without inheriting the loaded document's WeakMap provenance; documentSourceHash(nextSpec) remains null unless it is actually parsed/registered through the established provenance path. Do not attach the previous hash or invent parsed-source provenance for the constructed clone. committedRevision separately hashes the exact prepared Buffer successfully replaced on disk.129 can use that digest for the confirmed write outcome and actual subsequent parsed provenance for refreshed detail tokens.
