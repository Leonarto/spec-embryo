+++
doc_kind = "task"
id = "TASK-131"
title = "Verify revamp accessibility performance and packaging"
summary = "Complete browser, performance, coverage and installed-package checks; resolve review findings."
status = "todo"
spec_ids = ["SPEC-062"]
depends_on = ["TASK-129", "TASK-130", "TASK-138", "TASK-141"]
blocked_by = []
priority = 1
owner_role = "implementation"
created_at = "2026-11-15T18:31:13.896Z"
tags = ["parallel-implementation"]
updated_at = "2026-11-15T18:31:13.896Z"
+++

# Scope

Implement P7 of SPEC-062, including the contracts, edge cases and acceptance criteria defined there. Preserve the checkpointed baseline and keep changes confined to this slice.

# Execution and review

- Implementation: Sol 6.1 High (`ui_implementation`).
- Technical decisions and UX review: Astra High. Escalate uncovered design decisions before implementing them.
- Run relevant automated checks and capture evidence required by the spec.
- Move to `review` when implementation and evidence are ready; resolve findings before `done`.
- The orchestrator commits the reviewed slice before its dependent slice starts.
- Update relevant local instructions with the agents-md-maintainer skill.

# Verification record

Runner preparation, combined source checks and reusable component accessibility evidence are reviewed. Final runtime, volume performance and retention gates remain pending; this task is not complete.


# Integration acceptance record

At final freeze, map every SPEC-062 AC01–AC15 to concrete evidence and report passed/failed/not-run separately. Earlier slice results certify their frozen versions only. Reuse valid evidence; rerun affected flows and final packaging rather than duplicating every historical matrix. Include the scope of Bun coverage and the separate Svelte/browser flow matrix, actual contrast states, keyboard plus simple/no-JS fallback, question mutation/dirty conflict, responsive drawer history/focus, large graph equivalence and serial HTTP/performance budgets. Distinguish warm measurements from cold measurements. Record unavailable assistive-technology environments explicitly, never count axe as a screen-reader test. Perform a fresh external-project prepared-package runtime smoke against the final packaged assets. Review findings must be fixed and committed before closure.


# Astra performance measurement contract

# TASK-131 — cold-load measurement contract

The SPEC-062 list cold p95 <=2.5 s gate means application/browser cold. It does not mean purged OS filesystem caches. This resolves the previously unspecified cache layer without changing the numerical budget.

Run20 independent samples for Tasks and20 for Specs on the registered baseline machine, same committed runtime, deterministic10k-task/2k-spec fixture and pageSize100. Alternate routes across samples to reduce time-order bias, but each sample gets its own new server process and new browser process/profile. Do not visit both routes in one sample. No cold warmups, discarded slow samples or pooled percentile across routes. p95 is nearest rank: sorted sample19 of20. Any timeout/error is a failed sample/gate, not an omitted observation.

Use the supported shipped runtime (`spm ui`, currently Vite dev), not a faster substitute preview server. Prepare an isolated harness-owned runtime copy with empty generated Vite/Svelte caches per sample. Dependencies may already be installed, but optimizer/transform output must not be reused across samples; isolate its actual cache directory rather than clearing shared node_modules or an active developer server. Record exact launch command, commit, dependency versions, cache paths and setup. Fixture files stay identical; copying them does not prove cold OS cache.

Start the server and detect listening/readiness via its ready log or a TCP connection, never an HTTP GET that loads the app/fixture. Launch a fresh browser with empty HTTP cache, storage and service workers, fixed viewport/browser version and no artificial network/CPU throttling. Its first application navigation is the measured direct Tasks/Specs URL. There must be no prefetch, route request or fixture inspection through the application beforehand.

Measure browser navigationStart to correct first-page rows/count visible and hydrated table controls ready for keyboard, then two animation frames. Use explicit observable assertions against the known fixture and mounted enhanced grid, not networkidle/load alone. Record monotonic elapsed time, TTFB, response timing and the ready predicate. Lazy server transforms, data loading, asset download and hydration occurring after navigationStart stay inside the2.5 s measurement. Do not pause the timer for them. Report server startup spawn-to-ready separately; startup/installation/fixture preparation are not the list-navigation interval. HTTP-only timing is useful supplementary evidence but cannot replace this cold-load gate.

Report per-route20 raw samples, median, nearest-rank p95 and pass/fail; preserve errors and traces. Label the result exactly as application/browser cold with OS cache uncontrolled. OS-cold is a separate NOT RUN entry unless independently measured later: no global cache purge, reboot, cache-pressure tricks or interference with unrelated processes is required or authorized. OS-cold does not block this defined original gate. Warm measurement remains a separate series with5 warmups+20 samples and its existing budget; neither series substitutes for the other.

## Warm list gate: same observable end point

The warm list p95 <=800 ms is also end-to-end list navigation, not HTTP response time. For each route separately, keep one server and browser process/profile alive, run5 unrecorded warmup navigations and then20 measured navigations serially. Each navigation starts from a fresh blank tab/page in that same browser context (HTTP/assets cache retained, no retained Svelte page/component state), opens the same direct URL/pageSize100 and ends at the identical correct-rows + hydrated-controls + two-rAF predicate used for cold. Close the previous sample page before the next; do not run multiple list loads concurrently. This fixes a reproducible full-navigation path without mixing it with in-app filter/refresh or inspector metrics.

Use the same registered CPU/hardware, OS, browser version, viewport, power mode and no synthetic throttling as cold. Keep the fixture/commit stable and stop competing benchmark jobs; do not interfere with unrelated processes. Report incidental contention rather than silently deleting outliers. Per route report all20 samples, median and nearest-rank p95 (sample19); each route must meet800 ms. Timeouts/errors fail the gate. Click-triggered filters/refresh and detail measurements retain their own specified start/end and thresholds; they cannot replace this navigation metric.

The TASK-126 HTTP p95 around550 ms is useful server/transport evidence only. It is neither a passing final warm800 ms end-to-end result nor a cold result. TASK-131 must measure final combined assets, browser rendering and hydration; explicitly preserve this distinction in its acceptance matrix.

## Final verification preparation

The independent Astra review in `web/verification/task131-final-plan.md` defines the minimum combined checks, reusable evidence, remaining measurement harnesses and known historical-script limitations. It adds no threshold waiver. Final verification waits reviewed source integration; isolated harness preparation may proceed without claiming acceptance or changing product behavior.

Runner preparation follows `web/verification/task131-runner-decisions.md`: existing tool orchestration plus a finite owned-process lifecycle CLI, no HTTP controller or new dependency. Warm/cold samples use ordinary isolated source runtimes; a separate exact-archive prefix/bin smoke verifies the prepared package. First-navigation blank time is recorded honestly and does not waive loading or navigation budgets.

## Runtime correction for final acceptance

TASK141 replaces the ordinary shipped DEV launcher with reviewed precompiled Node client/SSR assets; its concrete contract is `web/verification/task141-runtime-design.md`. The earlier DEV cold-cache setup is historical after that integration. Build artifacts before the measurement interval, validate them at startup, and use the actual shipped readiness signal with fresh server/browser/profile per cold sample. Startup includes manifest validation and is reported separately; no application HTTP prewarm or document preload. Preserve original20cold/5+20warm, navigationStart, correct rows/hydrated controls/two frames and numerical thresholds. Adapt only runtime preparation/readiness; reuse unaffected component accessibility evidence with explicit source identities. Final code/package review and commit must precede the one final acceptance window.

## Accessibility checkpoint

Axe identified a named generic div around Mermaid zoom buttons. Astra approved a one-attribute correction to role=group, preserving native button keyboard behavior. Independent review verifies the exact patch/blob, named rendered group, zero affected axe violations/incompletes, five Tab/Enter/Space checks and Svelte0/0. Evidence: `web/verification/task131-mermaid-fix.json` and `task131-mermaid-role-review.md`. This is a focused fix, not completion of overall accessibility or performance acceptance.

The user explicitly asked to leave real browser zoom200% pending because macOS is locked and cannot currently be unlocked. No native zoom was changed; CSSzoom/pinch-scale are not substituted. Remaining checks proceed, with this test reported pending rather than passed.

The same narrow semantic review found one remaining labelled generic container in TimelineRuler. Its reviewed role=group correction preserves tick text and native focus behavior; affected axe0/0 and Svelte0/0 pass. An AST sweep of43 Svelte components and58 labelled native elements found no other obvious unroled generic labelled containers. The focused proof is `web/verification/task131-ruler-fix.json`; this does not replace the remaining complete accessibility matrix or runtime tests.

## Reviewed component accessibility matrix

The six-artifact manifest and independent review in `web/verification/task131-accessibility-manifest.json` and `task131-accessibility-review.md` verify ten axe states, exact component/style identities, existing contrast proof and three captures. Keyboard, forced-colors and reduced-motion checks pass within the recorded scope. Native200% remains explicitly user-deferred, screen readers unavailable, and volume bounds retain their separate TASK130 evidence. Owned browser/server resources are closed and dependency inventories unchanged. This reusable checkpoint does not accept the future compiled runtime, performance or retention gates.

## Final finite interaction contract

The missing interaction measurements follow Astra's concrete contract in `web/verification/task131-final-interaction-contract.md`: fixed trusted-event samples, original thresholds, exact query/result oracles, decoded payload bytes, real wheel/long-task observations and a bounded stability sequence. H owns runtime/navigation/detail/retention; a second Sol owns only the interaction helper and pure tests. No product edits or performance series are authorized during preparation. An independent review, tiny functional smoke and harness commit precede the actual window.

Missing PaintTiming is not a passing loading observation or proof of blank time. A verified fresh navigation from about:blank with no prior app/worker/prerender and document responseStart greater than150ms independently proves no app HTML indicator before the budget; report that lower bound without inventing a paint timestamp. Otherwise, absent positive paint/indicator evidence remains NOT PROVEN. Final acceptance retains the original navigationStart clock and all failures.

## Reviewed interaction helper preparation

Astra approved the two-file v2 helper and scoped browser proof. Fifteen deterministic tests pass82 assertions. The single tiny compiled run exercised trusted key/click/input, real wheel, long-task observation and stability on both routes; its original overall FAIL is preserved for a Fetch.status API mistake in the payload reader. After the minimal fix, only two payload GETs were revalidated successfully. No interaction series was replayed and no AC13 latency credit is claimed. Resources/dependency audits pass and242 fixture documents remain unchanged. See `web/verification/task131-interactions-final-review-v2.md` and the evidence map. The frozen manifest's inherited no-browser sentence is stale preparation metadata; its smoke fields and final review describe the actual later run.

## Reviewed compiled-runtime runner

The11-file runner/map freeze is independently approved in `web/verification/task131-precompiled-runner-final-review.md`. The actual small compiled browser smoke passes; process/dependency cleanup is verified. Twenty-eight focused tests pass154 assertions, including the corrected trusted event timestamp for skeleton latency. The original detail collector is unchanged. Missing paint data, global DOM listener counters, fixture separation and Timeline evidence reuse are explicit in the map. Technical approval covers one fixed detail → warm → cold → supplemental interaction → retention sequence after the orchestrator records final source/build/fixture/oracle identity and reserves exclusive owned resources. No performance result is claimed by preparation.
