+++
doc_kind = "task"
id = "TASK-141"
title = "Ship a precompiled local UI runtime"
summary = "Build and verify packaged Node SSR assets, preserve explicit DEV workflow and canonical shared services, then independently review installed-runtime behavior."
status = "in_progress"
spec_ids = ["SPEC-062"]
depends_on = ["TASK-130"]
blocked_by = []
priority = 1
owner_role = "implementation"
created_at = "2026-11-16T16:52:51.165Z"
tags = ["ui", "runtime", "packaging"]
updated_at = "2026-11-16T16:52:51.165Z"
+++

# Scope

Implement the independently approved contract in `web/verification/task141-runtime-design.md`, with the precise inventory/Host/Node/package requirements in `task141-runtime-design-review.md`. Astra High owns technical decisions and independent review; Sol 6.1 High implements the cohesive runtime/build slice in isolation. Root maintains shared documentation and project memory.

Ordinary `spm ui` serves precompiled official adapter-node5.5.8 client/SSR output under actual Node>=22.12. Explicit `--dev` retains the contributor workflow. Build and validate deterministic package-owned input/output identity; reject incomplete/stale/tampered artifacts before binding. Preserve project selection, fresh shared services, guarded canonical questions, production CSRF and strict advertised Host/origin. Own bounded binding/readiness/child shutdown; do not compile, preload documents or write into the installed package during normal launch.

# Ownership and sequencing

Sol owns UI command/service/artifact helper, CLI help, web/runtime and its local guide, adapter config, root/web manifests and lock, build script and meaningful artifact/runtime/package tests. Root owns shared README/architecture/AGENTS/publish-skill updates. Editor/controllers, repository/memo, domain/graph, UI components and acceptance thresholds remain unchanged.

Depends on completed TASK130 and consumes the committed functional TASK138 checkpoint; it does not depend on TASK138 performance completion. TASK138's next real latency gate and TASK131 final runtime acceptance consume the reviewed TASK141 commit. This avoids a dependency cycle. No performance reruns before independent code and installed-package review.

# Done Looks Like

- Unit/artifact gates cover strict flags, Node identity/minimum, deterministic extraction-safe identity, missing/mixed/stale/tampered output, source/lock mutation and failed builds without a success marker.
- Fresh real archive/prefix with production dependencies runs the installed bin from two external fixture roots with a read-only package tree; six routes, assets, lazy readers, canonical native/enhanced questions and recovery preserve behavior.
- Host/Origin rejection preserves document bytes; same-origin large recovery bodies, port fallback, IPv6 where available, signal/disconnect/startup cancellation and listener closure are verified.
- Generated imports and initial Tasks JS dependency closure are inspected; normal startup needs no Vite/compiler/development-source import.
- Astra independently approves code plus actual installed package evidence; root integrates and commits before final acceptance timing. No publish/global installation, threshold waiver or claimed performance pass belongs to this implementation checkpoint.
