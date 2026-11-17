# TASK131 component accessibility evidence

This is reusable component evidence on product `9a446a1`, with focused group-role fixes committed as `e3e6f3c` and `d3a4a4d`. It does not accept the forthcoming precompiled launcher or any latency gate.

| Check | Result | Evidence |
| --- | --- | --- |
| Tasks/Specs lists, Task inspector, Spec editor, dirty dialog, conflict, recovery, success, visual/simple Timeline: ten axe states | PASS: zero serious/critical violations | [Full results](task131-accessibility.json) |
| Labelled Mermaid controls and Timeline ruler | PASS: native groups; affected axe rule clear; labels/ticks intact | [Mermaid](task131-mermaid-fix.json), [Ruler](task131-ruler-fix.json) |
| Dirty Close/Keep, keyboard review/save, confirmed answer, opener focus | PASS | Full results; only generated SPEC-002 intentionally changed |
| Timeline Enter opens Task; Escape restores materialized opener | PASS | Full results |
| Forced-colors reflow at 390 px; reduced-motion | PASS: browser emulation, no horizontal overflow; durations 0.01 ms, zero running animations after two frames | [Capture](task131-forced-colors-390.png), full results |
| Native browser 200% zoom | PENDING, user-deferred | Mac locked; no CSSzoom or pinch substitute used |
| VoiceOver/Safari; NVDA/Firefox | UNAVAILABLE / NOT RUN | Never inferred from axe or an accessibility tree |
| Future installed precompiled runtime, latency and 100-cycle retention | NOT RUN in this component pass | TASK141/final-source gates remain separate |

Axe color-contrast incompletes are decorative `aria-hidden` glyphs with adjacent textual labels. Existing text/placeholder contrast evidence is reused from [TASK129](task129-contrast-browser-report.json): `app.css`, `SpecQuestions.svelte` and `QuestionLeaveDialog.svelte` are unchanged between `d761ccb` and `9a446a1`; the two role fixes change no styles. Light/dark resolved colors and all incomplete selectors remain in the JSON.

The 108-task fixture intentionally takes the documented normal-render path at ≤500 tasks. Its 110 items are not evidence for the volume fixture's 80-task reference budget; the independently reviewed TASK130 volume proof retains 34 rows for 10k tasks. Read-only Task/Spec bytes were checked before the deliberate conflict/save flow. Final disk verification found only the intended spec changed and confirmed the recovered answer was not silently written.

All owned servers and the browser are closed; final original dependency inventories match. The native 200% test remains pending by the user's explicit choice. No overall TASK131 completion or detail 300 ms pass is claimed.
