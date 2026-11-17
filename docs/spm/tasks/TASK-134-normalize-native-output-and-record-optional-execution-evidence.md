+++
doc_kind = "task"
id = "TASK-134"
title = "Normalize native output and record optional execution evidence"
summary = "Implement reviewed SPEC-061 P1-C parsers, receipts, exact session references and stale-safe handoff proposals."
status = "done"
spec_ids = ["SPEC-061"]
depends_on = ["TASK-133"]
blocked_by = []
priority = 1
owner_role = "implementation"
created_at = "2026-11-15T18:47:28.298Z"
completed_at = "2026-11-15T20:44:06.054Z"
tags = ["parallel-implementation", "harness"]
updated_at = "2026-11-15T20:44:06.054Z"
+++

# Scope

Implement reviewed SPEC-061 P1-C parsers, receipts, exact session references and stale-safe handoff proposals.

Source of truth: the independently reviewed P1 execution contract appended to SPEC-061. P2 remains conditional and outside this task.

# Execution and review

- Sol 6.1 High implements; Astra High decides technical changes and independently reviews a frozen diff.
- Preserve the documented byte limits, process deadlines, ownership checks and read-only defaults.
- Test provider/configuration behavior with isolated fixtures; no real hook installation, paid model invocation or personal configuration changes.
- Record actual verification evidence, resolve findings and commit before the next dependent slice.

# Verification record

Implemented and independently approved by Astra after three corrective regressions. Global suite before those narrow fixes: 309 pass, 0 fail, 90.89% function / 91.65% line coverage. Corrective independent recheck: 26 pass, 269 expectations. All 33 final hashes matched; four shared documentation changes matched the reviewed patch exactly. AGENTS and diff checks pass. Native provider behavior uses versioned synthetic fixtures, without paid model calls or universal compatibility claims.


# Astra protocol decisions

- With an explicit native protocol, invocation.output is empty and a fixed warning explains intentional omission; native_result.final_text is the only model text exposed. Preserve byte/truncation counters and process state. Generic P0 output without a protocol remains unchanged.
- A present invalid native session ID (empty, over 512 UTF-8 bytes, whitespace, Cc/Cf characters, or leading hyphen) becomes null with a warning that does not echo its value and sticky fatal/unknown protocol status. An absent optional ID is null without fatal status.
- Receipt loading uses the same validator and rejects invalid IDs with usage exit2 before any spawn.


# Astra guard/lock decision

During the compare performed under the verified shared write lease, exclude only that lease's exact owner.json path after verifying token and PID. Never exclude a whole lock directory, another file, a tracked owner path or a path already present in the captured guards. Revalidate the lease after comparison and before writing. Extend the existing storage lock callback additively with a readonly lease; existing callers remain compatible. No gitignore rewrite, alternate lock or public snapshot change.


# Unverified process-tree closure

Astra requires invocation unknown with unconfirmed tree closure to produce an incomplete final guard with reason tree-closure-unverified. Preserve observed snapshots/diagnostics and invocation exit1 in the receipt. Preview remains useful, but handoff apply exits usage2 before writes even if hashes later match. No force flag or retroactive upgrade of that receipt is introduced.


# Managed source symlink limitation

Astra requires an incomplete guard with managed-source-bytes-unverified when a managed source's captured content hash cannot be verified as a regular file in the guard. Do not misleadingly report changed content or follow an extra target implicitly. Receipt/preview remain useful; apply returns usage2. A code symlink guard certifies the link bytes, not an unobserved target.


# Independent implementation review

Astra reviewed the 28-file freeze against `c80b93b` and independently ran 30 focused tests (310 expectations). The first review requested three corrections: literal argv substitution for opaque session IDs containing JavaScript replacement metasequences; malformed UTF-8 receipts must return usage/precondition exit 2 while genuine I/O remains exit 1; receipt enum validation must reject coerced arrays, including nested fields. Sol corrected all three findings with regressions. Astra reproduced each corrected case, approved the 29-file code freeze, then approved the four applied shared documents and all 33 final hashes. No findings remain open.
