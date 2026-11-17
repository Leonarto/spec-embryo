# Independent review — precompiled local UI runtime

Decision: approve the concrete design for isolated implementation. No blocking design finding remains. This is permission to implement and verify the defined runtime/build slice, not approval of code, packaging, release or performance acceptance.

Reviewed `/private/tmp/spm-precompiled-ui-runtime-design.md`, SHA256 `30c7c674a2a764d957eec78f8f68bc244c5b368322529a10901b3189ae45cc91`, against the current launcher, UI configuration, package layout and installed Kit 2.55 runtime. Independently checked the pinned adapter 5.5.8 source: its Kit peer range includes 2.55, its generated handler supports the proposed wrapper, fixed origin and body limit, and its bundling behavior explains the explicit dependency-closure gate. Sources: [package compatibility](https://raw.githubusercontent.com/sveltejs/kit/@sveltejs/adapter-node@5.5.8/packages/adapter-node/package.json), [adapter generation](https://raw.githubusercontent.com/sveltejs/kit/@sveltejs/adapter-node@5.5.8/packages/adapter-node/index.js), [handler](https://raw.githubusercontent.com/sveltejs/kit/@sveltejs/adapter-node@5.5.8/packages/adapter-node/src/handler.js).

The design addresses a concrete product property: ordinary installed `spm ui` currently invokes development compilation. Precompiled client and SSR artifacts, with explicit `--dev`, remove that runtime compiler requirement. They do not establish the cause of all warm tails or guarantee that any unchanged budget will pass. The valid final 9a446a1 result remains FAIL: Task p95 398.0 ms and Spec 523.5 ms against 300 ms. Its independent review is `/private/tmp/spm-task138-final-detail-review.md`.

The approved boundary is coherent:

- Build explicitly at release preparation; validate package-owned source, lock and complete output identity once before normal startup. No automatic build, silent DEV fallback, project-data scan or first-request warmup.
- Launch actual Node with declared minimum version, keeping the Bun CLI. Use public adapter output, with no TS transpiler, Vite runtime or private generated-source import in the production path.
- Preserve runtime project selection and fresh shared services. The repository reader, memo, source revisions, DTOs and guarded action remain unchanged.
- Bind the actual bounded port sequence, then establish one advertised authority and fixed origin before importing the handler. Reject hostile Host values before dispatch; ignore forwarded-origin overrides. Keep production CSRF checks and unchanged action/body semantics.
- Publish only the reviewed package closure. Verify the real tarball, external fixture roots and read-only installed tree; never expose server output, package source or project documents as static files.
- Readiness follows handler initialization. Cancellation, IPC disconnect, draining, escalation and child/listener ownership have explicit bounded contracts.

Implementation details to preserve in code review:

1. The output inventory excludes only its own `spm-manifest.json` from content entries, avoiding a circular hash. Validate the manifest itself structurally and its canonical build identity; reject any other unexpected output. Input/output traversal and symlink rules must be enforced by the enumerator, not assumed from manifest paths.
2. Detect duplicate Host fields using raw headers; Node's normalized header map alone can discard duplicates. Normalize IPv6, hostname case and the configured actual port consistently. Keep rejection before Kit dispatch and prove foreign/missing-Origin form rejection with unchanged fixture bytes.
3. Validate the selected executable as the declared Node runtime, not merely an executable named node. Keep minimum-version validation and real packed-runtime compatibility evidence distinct from the Node 25.6 performance environment.
4. Treat the produced tarball and its installed dependency closure as the package evidence. A checkout build or existence of handler.js alone cannot establish global-prefix correctness. Record manifest-verification/startup cost openly.

These are precise readings of the existing contract, not additional product scope or a request for another experiment. The finite unit, artifact, installed-package, lifecycle, action and security checks precede independent code/package review. Only after that review may the orchestrator authorize the defined final acceptance window on the actual shipped runtime. Preserve original cold/warm/detail methodology and all historical failures; no retry until PASS, threshold change or cache/preload substitution.

No product file was edited, no server started and no benchmark run during this review.
