# TASK-135 — canonical detail extraction

Mechanical extraction of the canonical task/spec presentation into immediately consumed components. The route pages still adapt loader/action data and own document titles. No loader, action, service, domain, shared stylesheet or Mermaid implementation changed.

## Scope and checks

- `TaskDetail` and `SpecDetail` receive existing detail unions; the spec form receives the same action-result fields through a local presentation type.
- The markup and styles following the old route heads are byte-for-byte identical to the markup and styles following the new component scripts. Only the component script imports/props and route composition changed.
- `bun run web:check`: zero errors/warnings on the isolated slice. The shared working-tree rerun saw three transient type errors in TASK-127's in-progress files; those files were not changed here.
- `bun test tests/detail-presentation.test.ts tests/details.test.ts tests/spec-detail-actions.test.ts tests/spec-answer-evaluation.test.ts`: 11 passed, 0 failed, 69 assertions. The four new SSR tests cover canonical links/values/order, ordinary POST fields, action error/saved count/evaluation, Mermaid loading presentation and both missing-result variants. The fixture and Vite cache are disposable and cleaned after the tests.
- `bun run check:agents`: passed, including the new leaf guidance.
- Final isolated base: `git archive f2b65aff57820aa1c419eef00ae7df7f9180ebbe` into `/private/tmp/spm-task135-isolated`, overlaid only the two canonical pages, `components/detail/**` and the new SSR test. Existing local root/web dependency directories were symlinked; no installation or network access. `bun run web:check` and `bun run --cwd web build` passed. This excludes TASK-127's partial changes; its checks and final integration remain separate gates.

## Browser comparison

A disposable project under `/private/tmp/spm-task135-visual-*` contained one linked blocked task, a spec with one open question, a Mermaid flowchart and 24 narrative paragraphs. A temporary baseline Vite load plugin served the saved original page sources at their original route filenames. A second server served the extraction; both read the same fixture. No workspace source swapping was used. Servers ran from `web/`, then were stopped. Browser lease was explicitly returned after `browser_close`.

At 1440×1000 and 390×844, before/after task and spec views had identical complete text, heading order and canonical links. Document scroll width equalled viewport width. Mermaid produced an SVG in both versions and sizes. The screenshots below preserve the existing design; this is not a redesign or contrast certification.

| View | Before | After | Changed pixels |
| --- | --- | --- | ---: |
| Task desktop | [before](task135-detail-extraction/spm-task135-tasks-desktop-before.png) | [after](task135-detail-extraction/spm-task135-tasks-desktop-after.png) | 159 / 1,440,000 |
| Task mobile | [before](task135-detail-extraction/spm-task135-tasks-mobile-before.png) | [after](task135-detail-extraction/spm-task135-tasks-mobile-after.png) | 56 / 329,160 |
| Spec desktop | [before](task135-detail-extraction/spm-task135-specs-desktop-before.png) | [after](task135-detail-extraction/spm-task135-specs-desktop-after.png) | 0 / 1,440,000 |
| Spec mobile | [before](task135-detail-extraction/spm-task135-specs-mobile-before.png) | [after](task135-detail-extraction/spm-task135-specs-mobile-after.png) | 8 / 329,160 |

Screenshots were compared as RGB pixels with Pillow. The small pixel differences have maximum channel deltas of 22, 4 and 1 respectively; markup/styles and visible geometry/content remained unchanged. These captures are viewport captures; complete narrative text and the rendered below-fold SVG were separately checked in the browser.

The [missing task](task135-detail-extraction/spm-task135-tasks-missing.png) and [missing spec](task135-detail-extraction/spm-task135-specs-missing.png) retain the existing HTTP 200 GET behavior, missing-entity titles and available-ID links.

## Ordinary POST without JavaScript

A separate Playwright context used `javaScriptEnabled: false`. Clicking the existing native submit button with an empty answer returned HTTP 400 and showed `Add at least one answer before saving.`. Filling the answer and clicking again posted to `/specs/SPEC-002?/answerOpenQuestions`, returned HTTP 200, and displayed `1 answer recorded` plus `Continuation guidance` and the deterministic evaluation. See [saved response](task135-detail-extraction/spm-task135-nojs-post-success.png). The temporary spec bytes were restored from the saved pre-POST bytes afterward and verified equal. No real managed project data was mutated.

## Initial list loading

Fresh isolated browser contexts loaded `/tasks` and `/specs` without hovering/preloading entity links. Each initial development module graph requested 76 script/Svelte modules and zero `components/detail`, `MermaidBlock` or Mermaid runtime modules. The list sources were not modified by this extraction. The isolated production build's [manifest audit](task135-detail-extraction/production-import-audit.json) follows transitive static imports from `entry/app`, `entry/start`, layout/error and each list node. Neither closure includes the canonical detail nodes, DocumentBody/MermaidBlock or Mermaid runtime. Dynamic references to other routes in the app entry are intentionally not counted as eager imports.

## Boundaries

Inspector/panel behavior, navigation interception, draft state and missing-route HTTP 404 changes remain later tasks. This extraction introduces no unused inspector props or callbacks. The ordinary question action remains unchanged on the canonical server route.
