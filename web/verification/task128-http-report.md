# TASK-128 HTTP/SSR verification

HTTP/SSR and production static imports only; no browser, page-JavaScript, keyboard, layout, no-JS-browser or latency claims.

Result: **38 passed, 0 failed**. [Raw report](task128-http-report.json) records the exact base commit and 171 source hashes. Source was copied during an explicit stable window and verified before/after/copy; only that isolated checkpoint is certified. Production build passed using existing linked dependencies, without installation.

Checks cover closed Tasks/Specs initial static import closures, direct Task/Spec inspect SSR heading/body in actual markup (excluding serialized script data), genuine SSR close/canonical links, endpoint200/404/no-store, canonical404 with shell, and requestKey independence from inspect/section for Tasks/Specs/Timeline. A deliberately invalid-config project server returns400 for invalid kind/ID and500 for a valid identity, demonstrating validation happens before project IO. These are HTTP observations, not a native no-JS browser claim.

No failing checks.

Reproduce: `bun web/scripts/inspector-http-check.ts --prepare`; serve the built snapshot on two loopback ports with SPM_PROJECT_ROOT set to the returned initialized and invalid-config roots respectively; then run `bun web/scripts/inspector-http-check.ts <origin> <failing-project-origin> <fixture.json> <built-snapshot> <source-hashes.json> web/verification/task128-http-report.json`. This checker never writes project documents after fixture creation.

Snapshot: base `439da07` plus the exact uncommitted TASK-128 source captured during the coordinated window; 171 hashes verified before/after/copy. No browser lease or page JavaScript was used. Closed-list audit also checks initial chunk contents for detail-only text markers, guarding against accidental inlining.

Later source files not executed or certified: `web/src/lib/inspector/InspectorHost.svelte`. Tested/later hashes are separate in the raw report.

Both previews were stopped and both marker-owned temporary fixtures removed after verification.
