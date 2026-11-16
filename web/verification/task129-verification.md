# TASK-129 verification

The canonical page and inspector now share one persistent SpecQuestions owner. Exact drafts, recovery, accepted file revision, latest observation and frozen submission are independent of refreshed metadata. The canonical action consumes backend140's guarded writer; committed state stays authoritative when follow-up reads fail. A browser-document identity fence rejects loader seeds after confirmed or ambiguous outcomes, including initial remounts. One host guard protects destructive navigation and repairs interrupted history traversal without dropping the editor.

## Exact source and review

The final isolated source is `/private/tmp/spm-task129-final-validation`, created from committed `f8a7e1d1edbca416ece8ede8fc5d226d997e04e9` plus the explicit TASK-129 manifest. It includes the reviewed parse-memo producer and excludes mutable Timeline130 code. Earlier detailed browser checks used archive `ab6f3ebc21f89dd2578670e4124086aced84688b` plus frozen own files; the final integrated smoke checks the committed memo with the final editor. Shared README/architecture/AGENTS wording is orchestrator-owned.

Partial reviews: `/private/tmp/spm-task129-action-review.md` and `/private/tmp/spm-task129-client-review.md`. Closed findings cover POST-only root recovery, unsaved whitespace after partial saves, inert noJS controls, history interference and existing-token CSS/contrast. Historical failures remain in `task129-progress-report.json`; they are superseded by directed regression reports rather than rewritten as passing observations.

## Validation

- `bun run web:check` precedes tests in the clean snapshot: **0 errors, 0 warnings**.
- `bun test --coverage`: **444 pass, 0 fail, 8990 assertions, 75 files, 84.95 seconds**. Bun aggregate coverage is **92.50% functions / 93.60% lines**, including test-only fixtures/oracles; it does not measure all compiled Svelte/browser branches. No coverage gate/exclusion changed. Direct action/helper coverage is 100%; question-editor lines 96.55%; seed adapter 100%.
- `bun run --cwd web build` and `bun run check:agents`: **PASS**. Logs are `/private/tmp/spm-task129-final-{check,tests,build,agents}.log`.
- Production static closure: closed Tasks 30 and Specs 28 modules contain no detail/editor/DocumentBody/Mermaid imports or reader markers. Dynamic imports are intentionally excluded. See `task129-production-closure.json`.
- `npm pack --dry-run --ignore-scripts --json`: 193 files, required new runtime files present, no generated Svelte output or QA artifacts. No installation or publication occurred; combined packaging verification belongs to TASK-131. See `task129-package-audit.json`.

## Browser and native POST evidence

`task129-smoke-browser-report.json` covers double activation with one POST, exact whitespace baseline, confirmed/unknown outcomes, recovery and Save-and-continue. `task129-history-browser-report.json` covers native Back/Forward and delayed restoration with Keep/Save/Discard targeting only the latest observable destination. Public URL/PageState APIs are used; a same accepted-URL arrival cannot distinguish user intent from the controller's own restoration. It never auto-replays without a choice.

`task129-seed-browser-report.json` exercises a real Kit loader captured at A, a confirmed write B, late A delivery, retained DOM/outcome, canonical↔inspector remounts, withheld controlled reads and fresh-document SSR without duplicate detail fetch. `task129-navigation-browser-report.json` covers keyboard activation, same-entity filters/sections, modified new-tab links, relation/entity/full-page/route guards, exact DOM/input/focus across 1440/1024/390 widths, and native beforeunload dismissal. No abrupt-close recovery promise is made.

Real JavaScript-disabled contexts verify 400 exact echoes, 409 and a second external 409, explicit acknowledgement, 200 with unmatched recovery, and explicit no-write discard. A separate test copy injects persistent optional/shared post-action read failure: 200/400/409/404 render truthful outcomes/recovery without providers or editable fake details; ordinary GET missing remains 404. `task129-fault-injection.patch` changes only test-copy readers, never the writer or product source. The fixture is disposable and contains no private data.

Touch 390 px verified a 44 px Save button and confirmed tap save. `task129-contrast-browser-report.json` records placeholder light 6.54 / dark 8.21 and success light 7.29 / dark 9.85 against actual surfaces, plus the existing native-dialog backdrop. Desktop/mobile/dialog captures are adjacent. A native beforeunload modal preempts the automation result; the final navigation report is persisted after its dismiss handler and retrieved separately.

The final `task129-integrated-smoke-report.json` adds 10 passing checks on the exact final memo+editor snapshot with a fresh six-task/twelve-spec fixture. It uses Node 25.6 / Vite **DEV**, not a production HTTP server. The first cold dev compilation timed out before checks/writes; that setup failure is retained separately. No latency claim follows from this functional smoke. TASK-138's 300 ms gate remains open without waiver.

## Reproduction and boundaries

Create a fresh disposable fixture with `bun run web/scripts/spec-questions-fixture.ts`. The `spec-questions-check.mjs`, `spec-question-seed-check.mjs`, `spec-question-history-check.mjs` and `spec-question-navigation-check.mjs` exports accept a Playwright page and explicit local URL/IDs. Use fresh IDs/fixtures for phases that save answers. Linked local dependencies require a snapshot-only development filesystem allowlist; strict ports and fixture/process identity must be verified before writes.

No model calls, personal hooks/configuration, private agent sessions, answer storage, new mutation endpoint, Timeline implementation, read-path tuning or generic-grid redesign are part of TASK-129. Full combined 129/130 and installed-package checks remain TASK-131 gates.
