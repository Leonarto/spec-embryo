+++
doc_kind = "task"
id = "TASK-142"
title = "Resolve registered UI projects per request"
summary = "Harden shared portfolio registration and add request-scoped roots, identity guards and loopback registration actions."
status = "done"
spec_ids = ["SPEC-063"]
depends_on = []
blocked_by = []
priority = 1
owner_role = "implementation"
created_at = "2026-11-17T14:23:07.919Z"
completed_at = "2026-11-17T14:55:03.354Z"
tags = []
updated_at = "2026-11-17T14:55:03.354Z"
+++

# Scope

Backend slice in the approved SPEC063 contract. Terra6.1High owns shared registry, request root and expected-identity enforcement, registration actions and tests. Root maintains managed docs/guides. Independently review source/tests before commit; no real user registry writes. Isolation fixture tests cover collisions, atomic concurrent updates, invalid selections, remapped roots, question writes and loopback policy.

## Integrated verification

The integrated0.4.0 backend and UI pass523 tests/10609 assertions, Svelte0/0, build, doctor and AGENTS. The four initial full-suite failures were test fixture setup/SSR aliases, corrected in23dcf56; the original failure and focused rechecks remain recorded. Installed multi-repo smoke verifies registration, same-ID tabs, real client workspace guards, native/enhanced root-correct writes and guarded switch; stale remap saves preserve all three spec files. Final raw evidence/package closure is reviewed under TASK144 before completion.

## Reviewed 0.4.0 delivery evidence

Independent final review approves installed multi-repo behavior and package scope in `web/verification/release-0.4.0-review.md`. Full suite523pass/2explicitpackage skips/0fail; separate package gate2pass121asserts; Svelte0/0, doctor, AGENTS, build and publish dry run pass. Actual installed package verifies CLI/UI registration, identical-ID tab isolation, guarded native/enhanced saves and switching, terminal remap recovery with exact byte preservation, and remote/origin registration denial. Browser results are live-observed findings summarized with scripts, not retained raw tool output; relation pagination has direct endpoint coverage. Historical SPEC062 latency/retention/AT limitations remain. Version commit and GitHub push precede final npm2FA handoff.
