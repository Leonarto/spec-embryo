# TASK131 harness preparation review — APPROVED after F131-1/2/3

Manifest `/private/tmp/spm-task131-preparation-manifest.json`, SHA256 `2973ccdce282b3b891b7ffd0880e3364425efc6b1c9742137fd10a4777240c78`: all 10 file hashes independently match. Reviewed all seven acceptance modules, the test, local guide and preparation record against the durable runner decisions. No browser, runtime launch or timing series was executed. One pure adapter repro was run without launching processes.

## F131-1 — capture the actual browser endpoint

In acceptance-navigation.mjs, measureListNavigation waits for readiness and two animation frames, then makes another page.evaluate call to obtain performance.now(). Thus elapsedMs includes protocol/host delay after the declared endpoint. Record the end timestamp inside the browser when the second rAF completes, and return that fixed value in later diagnostics. Prefer keeping readiness and the two-frame completion in the same browser-side wait so a successful predicate is not followed by another host round trip before scheduling completion. NavigationStart remains the origin; no compile/response/hydration time is removed. A focused test should prove later diagnostic collection cannot change elapsedMs.

## F131-2 — cleanup errors must not erase evidence

page.close and context.close throw from finally blocks and can replace an otherwise completed sample or entire warm-series report. coldNavigationSeries overwrites value.error when adapters.stop throws, losing an earlier browser failure. Independent pure repro with browser throwing BROWSER_PRIMARY and stop throwing CLEANUP_SECONDARY returned only CLEANUP_SECONDARY for both samples.

Preserve the primary error, cleanup errors, collected samples/warmups and diagnostic partials in a fail-closed report. Cleanup still runs in finally, but its failure must not discard that report. If browser or runtime closure is unverified, stop the series with explicit partial/not-run remainder and a failed summary; do not launch further work or repeatedly attempt an occupied active lease. A measurement failure whose cleanup is confirmed may continue, but remains a failed sample. Add targeted close/stop failure tests, including a successful sample followed by cleanup failure.

## F131-3 — actually verify dependency immutability after use

The contract requires dependency before/after inventory equality. Current linkDependencyRuntime computes an inventory but discards it; stopRuntime records only cache directories. A later dependency mutation would not invalidate the run. Keep a baseline inventory and explicitly compare both the owned seed and runtime dependency files after use, outside navigation timing. Return the comparison/evidence and fail the run if bytes/link targets differ. The read-only mode is a prevention measure, not the promised verification. Add a controlled owned-file mutation test; do not touch developer files or include these checks inside latency intervals.

## Scope otherwise acceptable for preparation

The finite CLI and tool adapters avoid a new HTTP controller/dependency. Fresh persistent browser launches check version and process identity; the lifecycle tracks its own POSIX group, readiness log/TCP/listener ownership and active lease. Source pins, empty per-runtime caches and independent copied dependency seed are explicit. Package extraction rejects traversal/links, validates declared executable bins and confines dependencies to its owned installation. Native grid readiness uses exact IDs/count and mounted controls, not only load/networkidle. Warm/cold schedule and nearest-rank percentile are correct, and missing/error samples do not pass. Static closure counts unique initial files instead of all lazy output. Axe and retention limits are correctly separated from screen-reader and latency claims.

This is not yet real BrowserType, spm ui or prepared-package validation. Their capability/setup checks remain necessary after the fixes and explicit browser lease. No whole acceptance series is authorized by this review.

## Authorized correction boundary

Only acceptance-navigation, acceptance-runtime/files, their narrow tests and affected metadata may change for F131-1/2/3. No product source or extra framework. Re-freeze the manifest and provide targeted results for rereview. Remaining preparation files retain this static assessment unless their bytes change.

## Focused rereview — all three findings closed

Refrozen manifest SHA256 `ffbe903cdc14dd3a62aa9dbd16dfaf9413dd2da102b47ab93d6896b7c3a9a86f`: all 10 hashes match. Compared with the original manifest, only acceptance-navigation, acceptance-runtime, acceptance-files, the narrow test suite and preparation metadata changed, as authorized.

F131-1 is closed: the browser-side readiness predicate returns a Promise with its timestamp captured in the second requestAnimationFrame. Later handle retrieval and diagnostic evaluation cannot replace that timestamp. The fixed-clock regression exercises the real predicate and confirms a later clock value does not alter the result.

F131-2 is closed: page/context/runtime cleanup errors are retained separately from primary measurement failures. Completed samples and warmups survive failure; an unconfirmed close stops additional work and records the unattempted remainder as NOT RUN. Both route summaries remain fail-closed for partial/error runs. The prior browser-primary/stop-secondary repro is now covered without losing either error.

F131-3 is closed: the immutable copy-time dependencies.json inventory is the authority. The seed and runtime are checked against it during preparation, before start and after stop, outside navigation timing. Unexpected additions, byte mutations and writable-file changes fail the comparison. A controlled mutation of a runtime hardlink proves both seed and runtime mismatch; subsequent start/seed reuse is rejected. The higher-level warm orchestration must include its final runtime cleanup/integrity result when issuing the complete gate report, as it already must own start/stop.

Independent execution: `bun test tests/acceptance-harness.test.ts` — 14 passed, zero failed, 70 assertions, 779 ms. This launches only the small synthetic bin test and temporary-file cases; it launches no real browser, spm ui server or performance series. CPU was released immediately afterward.

APPROVED for harness preparation and the next explicitly coordinated tiny-fixture/runtime/browser capability smoke. This is not proof that BrowserType fresh-process launch, real Vite cache paths, runtime startup/cleanup or the installed package work in the actual tool environment; those remain the planned smoke gates before any full series. No acceptance metric or TASK131 completion is claimed.

## Source bin mode smoke setup correction — APPROVED

Manifest SHA256 `3d83d1462f7e7eb911aef9b7030746518a440514f2bef5543fb43221a3f40918`: all ten payload hashes match. Only acceptance-runtime, the narrow test and preparation metadata differ from the prior approved preparation. The archived source entrypoint has mode 0644; the owned copied declared entrypoint is now normalized to 0755 before dependency linking. Realpath containment and a regular-file check restrict the operation to copied application files; bytes are compared before/after and original/prepared modes and SHA are recorded. Both declared bin aliases share the same verified target. The source tree is untouched and the actual bin remains the invocation path.

Read the targeted regression and reported 15 passing tests/76 assertions: source 0644 and bytes remain intact, copied 0755 bytes match, and the temporary bin executes directly. No repeated suite or browser launch by reviewer. This closes the EACCES preparation issue and permits the next coordinated tiny smoke; it does not certify actual spm ui startup yet. The installed-package smoke must still validate its real declared bin independently and document any preparation normalization.

A public installed Chrome application with the exact connected build 157.0.8103.78 may be supplied explicitly to BrowserType for one fresh persistent-profile capability smoke. Verify the launched runtime version and distinct owned process identity, record executable/profile/flags, and close it. Do not silently substitute a different build, reuse the tool browser as cold, inspect unrelated profiles or install software. A missing/incompatible executable remains an explicit capability failure rather than a passed cold gate.

## Capability smoke: shebang exec identity — correction required

The actual copied-bin smoke exposed a lifecycle preparation defect: the initial `/usr/bin/env bun` process executes Bun in place, retaining PID, PGID and process start time while changing its command. Comparing the combined start-time-plus-command string rejects a legitimate transition before the listener is recorded and prevents verified cleanup. This is not a product or latency failure; retain the original failed setup evidence.

Authorized minimal correction: record stable PID/PGID/lstart independently from the observed command. Derive the exact permitted launcher commands from the spawn bin and arguments. Accept only initial Bun or the monotonic env-to-Bun transition with identical stable identity and complete bin/arguments, including the requested port; do not accept a substring match, arbitrary interpreter, changed start/group or a reverse transition. Capture and persist the initial stamp before waiting for readiness, then persist the verified Bun phase. Apply the same permitted transition when checking launcher ownership during cleanup; listener verification remains strict and requires the owned process group.

For the already-running smoke only, reconstruct the original lease's stable fields and exact expected argv, verify them against its current launcher and the listener's group, and close the verified owned group using the existing grace/escalation rules. Do not kill by port/name or clear the lease until the group is absent. A mismatch remains unverified rather than authorizing a kill.

Only runtime, focused tests and preparation metadata may change. Regressions must cover env-to-Bun, initial Bun, stable-identity/argv mismatches and cleanup after the transition. Re-freeze and independent review precede the next tiny capability smoke; no timing series is authorized by this correction.

## Exec-transition focused rereview — APPROVED

Refrozen manifest SHA256 `c6b2fa93309875baaa828219c0276964998c21b5d3418dbf49d2a9ebbb853978`: all ten hashes match. Reviewed the narrow runtime/test/metadata delta. `parseStamp` separates start time from command; `advanceLauncherStamp` requires identical PID/group/start and exact captured launcher commands, allows initial Bun or env-to-Bun only, and rejects reverse transitions, alternate post-Bun commands and changed arguments. The initial identity is saved before readiness checks. `sameLauncher` persists an accepted transition and is used for both readiness and cleanup; the listener retains strict comparison. No product source changed.

Independent focused run: 16 tests passed, zero failed, 87 assertions, 1.036 s. The tests cover direct/transitioned phases and rejected PID/group/start/argv changes. The cleanup record for the previous owned runtime states verified original identity before TERM, absent known parent/listener and TCP listener, and an empty group enumeration. Its signal-zero EPERM is retained as a limitation, not misrepresented as ESRCH proof.

The next explicitly coordinated tiny capability smoke may run after repinning source to committed `9a446a1`, using the previously identified exact Chrome executable, new profile/process and complete cleanup/integrity evidence. Successful unit preparation is not yet a successful real runtime/browser smoke, and no full measurement series is authorized here. CPU is released; no browser was used during rereview.

## Post-smoke signal-zero EPERM — bounded observation correction

The tiny combined-source smoke reports fresh Chrome process/profile, exact build, hydrated Tasks/Specs and keyboard behavior, with the browser closed. Runtime TERM was authorized and sent, but the environment returns EPERM for the subsequent negative-PGID signal-zero probe even when the known processes/listener are absent. Preserve the active lease until group absence and dependency audit are complete; no second runtime is authorized yet.

Approved fallback only for signal-zero EPERM: execute `ps -A -o pid= -o pgid=` under LC_ALL=C. Require successful execution, nonempty output and complete parsing of every nonblank row as two positive integers. Any matching PGID proves a live member; a valid inventory with no matching group proves absence at that observation. Command failure, empty output or malformed rows remain unknown/error. Retain the EPERM and inventory-observation method in evidence. Signal-zero success and ESRCH preserve their existing meanings. This does not change identity verification or authority to send TERM/KILL and does not justify escalation by itself.

Authorize only the narrow lifecycle helper/test/metadata change and deterministic success/ESRCH/EPERM-with-members/EPERM-empty-group/invalid-inventory regressions. After re-freeze review, finish stop/audit for the existing lease without repeating the successful browser smoke.

## EPERM observation fallback rereview — APPROVED

Refrozen manifest SHA256 `491a1809e750663a3ec4120f108aa567c9c28d420f61a6cc7aad0335f8302b54`: all ten payload hashes match. The delta is restricted to runtime, its test and preparation metadata. `probeGroup` only consults a bounded five-second `ps` inventory after EPERM from signal zero. It requires nonempty, fully parseable positive safe integer PID/PGID rows; members imply alive, no matching members imply absent, and invalid/failed queries throw. Ordinary signal-zero success and ESRCH do not query the inventory. The signal error, observation method, inventory hash/count and matching members are recorded by stopRuntime. Existing launcher/listener verification still gates every TERM/KILL; the observation fallback does not authorize signals.

Independent focused regression: EPERM fallback test passed with 10 assertions (the other 16 tests were filtered, not repeated). It covers live/absent group results, malformed/empty/invalid-integer input, command failure and unchanged success/ESRCH behavior. The author's complete scoped result is 17 passing tests/97 assertions.

APPROVED to finish stop and dependency-integrity audit of the existing lease only. Preserve the already successful tiny browser evidence and do not repeat it. Overall smoke remains conditional on that actual stop/audit result; no full measurement series or product acceptance follows from this preparation approval.

## Consolidated tiny smoke review

Reviewed the 11-file consolidation manifest `6c80e54bcb06f37290586575ae86abc359bd0a556f78f37c61997471c7526542`: all payload hashes match and no implementation changed after the approved EPERM delta. Only the local guide, preparation metadata and new smoke evidence changed. The local guide accurately records lifecycle ownership, observation rules and preparation-only scope.

The real smoke on source `9a446a1e794b21b60283ad58ff11ce3dc0d853c0` records Chrome 157.0.8103.78 in a new profile/process (71989 versus shared tool 69013), exact hydrated five-task/two-spec lists, native ArrowDown movement and no page errors. Browser closure is recorded. Independently inspected the final stop artifact, runtime record and lease path: runtime is closed, active lease is absent, and seed/runtime dependency inventories exactly match their original baseline. The earlier EPERM and separate empty-group proof remain retained; the successful final stop does not erase the earlier setup failures.

The fresh 206-entry package's declared bin resolves inside the prepared owned prefix, is not a development-source inode, and successfully executes help/init/status from an external project. This establishes only the declared-bin CLI smoke, not package UI hydration/styles/lazy routes or npm registry/installer behavior. Package dependency integrity also matches its original inventory.

The first real DEV navigation took 12.07 s and both observed navigations had no app loading indicator within 150 ms. Evidence correctly preserves these observations without loading or percentile acceptance credit. No warm/cold series, package UI, retention, closure comparison, axe/manual matrix or final AC ledger is claimed. No browser or test was repeated during this consolidation review.

Only documentary correction requested before final hash approval: replace the obsolete `reviewFixes.runtimeBrowserSmoke` statement claiming pre130/NOT RUN with the completed 9a smoke and its actual remaining boundaries. No implementation change or rerun is required.

## Final consolidation — APPROVED for commit

Root corrected only the obsolete runtimeBrowserSmoke metadata value. Independently verified final manifest SHA256 `c63b24559cdea9be15d7dbbf1b6045ae05dcafabf330efbcfccbc7fc6fcd9fd7`, preparation metadata SHA256 `e43f2c20ee163bcce7f6cb97cda13f8f6cd1d54151cc0138554085efa0e95655`, and all 11 payload hashes with zero mismatches. The corrected value now describes the successful tiny combined-source smoke and explicitly retains package UI and series as NOT RUN. No implementation, tests or functional evidence changed.

APPROVED to commit the TASK131 preparation and tiny capability/runtime/CLI-bin smoke checkpoint. This is not TASK131 completion or acceptance of any latency/loading budget. Full package UI, final combined checks, series, retention, closure and accessibility/AC reconciliation remain pending as recorded. No further execution was required for this metadata closure.
