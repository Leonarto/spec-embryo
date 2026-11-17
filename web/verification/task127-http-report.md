# TASK-127 HTTP verification

HTTP-only SSR/GET and production static import audit. No page JavaScript, browser, keyboard, layout, selection, copy, prefs or warm/cold latency claims.

Result: **159 passed, 0 failed**. Exact source snapshot,155-file SHA256 manifest, cases and requests are in [raw report](task127-http-report.json). Snapshot base: `d311060e7455fa90471eba6d21e7bcdc120ec61a`.

The checker uses Bun HTMLRewriter to inspect server HTML, then follows actual SSR anchors and serializes successful native GET control fields. This proves markup/HTTP contracts; it does not prove native browser behavior. UI's separate no-JS browser and interaction checks remain required.

| Fixture tasks | View | Total matching | SSR rows | JSON rows | HTML bytes | JSON bytes |
| ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 0 | default | 0 | 0 | 0 | 32230 | 1392 |
| 0 | simple | 0 | 0 | 0 | 32476 | 1391 |
| 0 | board | 0 | 0 | 0 | 33453 | 1414 |
| 0 | board-simple | 0 | 0 | 0 | 32476 | 1391 |
| 1 | default | 1 | 1 | 1 | 35545 | 1696 |
| 1 | simple | 1 | 1 | 1 | 35791 | 1695 |
| 1 | board | 1 | 1 | 1 | 36320 | 1718 |
| 1 | board-simple | 1 | 1 | 1 | 35791 | 1695 |
| 200 | default | 200 | 200 | 200 | 567497 | 55179 |
| 200 | simple | 200 | 200 | 200 | 567743 | 55178 |
| 200 | board | 180 | 180 | 180 | 429667 | 49026 |
| 200 | board-simple | 200 | 200 | 200 | 567743 | 55178 |
| 10000 | default | 10000 | 200 | 200 | 607425 | 58559 |
| 10000 | simple | 10000 | 200 | 200 | 607710 | 58558 |
| 10000 | board | 9000 | 200 | 200 | 513514 | 57678 |
| 10000 | board-simple | 10000 | 200 | 200 | 607710 | 58558 |

Additional checks cover200-row maximum, primary aria-sort/native table markup, actual pagination and sort/entity anchors, page-size/filter GET fields including externally associated inputs, default Table, simple=1 forcing Table, Board unarchived scope, no source bodies/foreign dashboard arrays, no-store JSON and250KiB budget for100-row JSON. Production import audit follows static imports from app/start, layout/error and Tasks node5, excluding dynamic route references.

No failing checks.

Reproduce: prepare a marked fixture with `bun web/scripts/task127-http-check.ts --prepare`; serve the exact built snapshot with `SPM_PROJECT_ROOT=<fixture> vite preview --host 127.0.0.1 --port 5290`; run `bun web/scripts/task127-http-check.ts <origin> <fixture> <snapshot> <snapshot-hashes.json> web/verification/task127-http-report.json`. Snapshot creation must preserve all src/web source bytes and verify hashes before/after copying. No network install is required.

The source snapshot was copied during an explicit 15-second source-freeze window and verified before/after copying. A production build of that isolated snapshot passed. Subsequent UI-reported presentation-only deltas (`TaskBoard.svelte` font family/coarse-pointer link min-height and the Tasks preset select accessible label) are outside these exact measured hashes; this report is checkpoint evidence, not a claim that unmeasured later source bytes were exercised.

The isolated preview was stopped after verification. The marker-owned fixture was cleared and then removed; production source was not mutated. `postSnapshotDeltas` in the raw report records inspected later hashes separately from executed snapshot hashes.
