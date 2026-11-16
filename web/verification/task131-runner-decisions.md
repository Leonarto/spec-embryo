# TASK131 runner decisions

These are harness-only decisions. They authorize preparation and focused runner validation, not a benchmark window, a product change or a relaxed gate.

## Lifecycle and dependencies

Use exports that receive the existing tool's Chromium browserType and explicit lifecycle callbacks. Each cold sample must call browserType.launch (or launchPersistentContext with a unique empty profile) to create a NEW browser process, not merely a new context on the tool's shared browser. Close only that owned browser/process in finally; leave the tool's browser alone. Record version, process/profile identity and cleanup outcome. No Playwright dependency needs to be added to the product repository.

Prefer direct existing Node orchestration if the available browser execution environment actually exposes it. If it exposes only the Playwright page/browser API, a small temporary loopback lifecycle adapter is acceptable; it is not a reusable application/server framework. Bind only 127.0.0.1 on an owned port, require an unguessable per-run nonce in a request header, and allow only fixed start/status/stop operations for predeclared sample IDs. The controller owns the runtime/fixture mapping; clients cannot supply commands, arbitrary paths or process IDs. Permit one active runtime, bound startup/stop time, collect child logs, and terminate only the owned process group on completion/error. Stop the controller at the end. No product endpoint, global process kill or public listener is authorized.

Launch the actual supported `spm ui` binary from the external fixture. It currently runs Bun's `execPath` -> `bun run dev` -> `svelte-kit sync && vite dev`. Its initial “Starting ...” message is BEFORE readiness and it may choose another port. Use Vite's actual ready/listening evidence or a TCP check, reconcile the selected port with the owned process, and fail setup on an unexpected listener. Do not send a readiness HTTP request to the app or prewarm a route. Do not substitute preview/production serving for the shipped runtime.

Copy dependency bytes once into an owned temporary tree; links may point only within that tree. Per-sample runtime source and generated/cache directories must be distinct and initially empty. In particular, linking an entire node_modules directory can accidentally share its .vite cache: keep the actual optimizer/cache directory sample-local, using per-package links into the owned dependency copy if needed. Verify resolved cache paths rather than assuming the directory spelling proves isolation. Do not alter product Vite configuration or shared development node_modules. Any harness-only cache configuration must be explicit, identical across samples and limited to isolation, not disabling work.

Prepare fixtures/dependencies before timing. Cold keeps the approved 20 samples per route, new server/browser and no application requests before the measured direct navigation. Warm uses one server/browser, fresh blank pages with asset cache retained, five warmups and twenty measured serial navigations. Existing predicates, errors, percentile and thresholds remain unchanged. Setup and cleanup logs are retained separately from measured intervals; errors are never silently dropped.

## Prepared package runtime

A fresh tgz extracted under an isolated prefix/lib/node_modules/@leonarto/spec-embryo, with resolved dependency bytes copied into that prefix and a declared prefix/bin/spm symlink to the packaged bin target, satisfies the approved global-style runtime smoke. An offline installer is NOT additionally required. Invoke that bin itself from a fresh external project with the prefix/bin on PATH; do not replace the invocation with `bun /workspace/src/index.ts` or a development source symlink.

Record archive hash/inventory, prefix layout, bin realpath, copied dependency versions and the actual command/runtime. Every package/dependency link resolves within the temporary installation; no fallback to development files. Test generated-state regeneration and actual styles/hydration/lazy routes against the prepared contents. This certifies a prepared global-style runtime, not registry installation, npm lifecycle scripts, publishing or the user's real global environment. No real global installation is changed.

## First-navigation loading observation

Keep the navigation clock at navigationStart, through correct rows, hydrated controls and two animation frames; TTFB/compile/hydration cannot be removed. Separately record first visible application loading indicator, first application paint and the final ready time. Browser chrome/spinner, a test-created loading screen or an arbitrary delay does not satisfy the application's 150 ms loading condition.

Before response bytes arrive, an application-owned indicator cannot exist on a fresh blank document. Therefore, if a cold first-navigation sample remains blank beyond 150 ms, report that fact explicitly and do not mark the loading-indicator requirement passed. Record whether an indicator appears after the shell exists; this explains the boundary but does not silently move the 150 ms origin or waive the requirement. Any decision to reinterpret that requirement is separate from runner implementation. The <=2.5 s list gate and <=300 ms detail gate remain independently unchanged.

For existing-shell interactions, measure the actual product loading state from the initiating event (and the separate <=100 ms detail skeleton requirement). Do not conflate that result with initial-document loading.

## Selected adapter after reading the implementer's proposal

Reviewed `/private/tmp/spm-task131-runner-design.md`. Its final simpler alternative is selected: functions.exec orchestrates the finite lifecycle CLI through exec_command and the browser export through browser_run_code_unsafe. The browser VM's lack of require/process does not require an HTTP service. Do not implement the proposed loopback controller or locate private tool modules. Use the existing public BrowserType and tool adapters; validate fresh-process/version capability in the small smoke only after the UI browser lease is released.

The lifecycle CLI owns a detached runtime group, logs and a lease containing runtime path, nonce, PID/group and process-start identity. Stop validates that identity before terminating only its own group, confirms closure and retains errors. The orchestrator awaits stop in finally for every sample. Do not leave sample runtimes running after a browser failure.

Choose ordinary isolated source layout for warm/cold timing, using the actual spm ui entrypoint and the same layout for both series. Keep the global-style packaged invocation as a separate functional smoke; packaged optimizer/path behavior must not be silently mixed into the navigation distributions. Prefer natural filesystem cache isolation. If an explicit copy-only Vite cacheDir override is necessary, limit it to that property, record its exact delta and use the same isolation rule consistently; no optimizer settings or product source behavior change.

The proposed readiness predicate (exact page IDs/count, onMount grid/control state, two rAF) and a separate tiny-fixture ArrowDown smoke are appropriate. Retention via CDP GC/listener metadata and identical baseline/final static-closure gzip are appropriate preparation, with the limitations already recorded above. Final series remain gated on the combined source and root's quiet CPU/browser window.

## Owned dependency hardlinks for ordinary source layout

The source runtime's fs.allow includes packageRoot and fixture, so package symlinks resolving to an external seed would produce403. Approve one independent byte copy of dependencies to a harness-owned seed, then hardlinks from that seed's immutable regular files into each runtime's own directory tree. No hardlinks to the developer tree or product source. Verify the seed inode differs from the original; preserve internal relative symlinks only when they resolve within the runtime/allowed installation, not the external seed.

Directories, generated state and optimizer caches remain per-runtime and initially empty; do not hardlink .vite/.vite-temp/.cache contents. Keep dependency regular files read-only without following development links. Record before/after dependency inventory/hashes outside measurement to detect unexpected mutation; mutation/setup failure is not silently accepted. This supersedes the earlier blanket no-hardlink preparation constraint only for the separately copied, owned, immutable dependency seed. No Vite fs.allow override or performance run is authorized by this adjustment.
