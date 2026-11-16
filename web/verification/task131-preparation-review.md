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
